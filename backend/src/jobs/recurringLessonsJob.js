const cron = require('node-cron');
const { Op } = require('sequelize');
const { Group, Lesson } = require('../models');
const { withLock } = require('../utils/distributedLock');

const WEEKS_AHEAD = 4;
const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

// ---------- Утилиты ----------

function formatDateStr(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeTime(t) {
  // '9:00' → '09:00:00', '10:30' → '10:30:00'
  const [hh, mm] = String(t).split(':');
  return `${String(hh).padStart(2, '0')}:${String(mm || '00').padStart(2, '0')}:00`;
}

/**
 * Парсит group.schedule (JSONB) в нормализованный объект
 * { monday: [{ start: '10:00:00', end: '11:00:00' }], ... }
 */
function parseSchedule(raw) {
  if (!raw) return null;
  let obj = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== 'object') return null;

  const result = {};
  for (const day of DAY_NAMES) {
    const value = obj[day];
    if (!value) continue;
    const ranges = Array.isArray(value) ? value : [value];
    const slots = [];
    for (const r of ranges) {
      const m = String(r).match(/^\s*(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*$/);
      if (!m) continue;
      slots.push({ start: normalizeTime(m[1]), end: normalizeTime(m[2]) });
    }
    if (slots.length) result[day] = slots;
  }
  return result;
}

/**
 * Генерирует занятия для одной группы на N недель вперёд.
 * Пропускает прошлые времена сегодня. Идемпотентно.
 */
async function generateLessonsForGroup(group, weeksAhead = WEEKS_AHEAD) {
  const schedule = parseSchedule(group.schedule);
  if (!schedule) return { created: 0, skipped: 0 };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const totalDays = weeksAhead * 7;

  let created = 0;
  let skipped = 0;

  for (let offset = 0; offset < totalDays; offset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);

    const dayName = DAY_NAMES[date.getDay()];
    const slots = schedule[dayName];
    if (!slots) continue;

    const dateStr = formatDateStr(date);

    for (const slot of slots) {
      // Сегодня — пропускаем уже прошедшие занятия
      if (offset === 0) {
        const [hh, mm] = slot.start.split(':').map(Number);
        const startAt = new Date(date);
        startAt.setHours(hh, mm, 0, 0);
        if (startAt <= now) {
          skipped += 1;
          continue;
        }
      }

      try {
        const [, isCreated] = await Lesson.findOrCreate({
          where: {
            groupId: group.id,
            date: dateStr,
            startTime: slot.start,
          },
          defaults: {
            endTime: slot.end,
            is_cancelled: false,
          },
        });
        if (isCreated) created += 1;
        else skipped += 1;
      } catch (e) {
        // Уникальный индекс уже есть — пропускаем
        skipped += 1;
      }
    }
  }

  return { created, skipped };
}

/**
 * Отменяет будущие не-cancelled занятия группы, которые больше
 * не соответствуют новому schedule. Сами записи не удаляет.
 */
async function cancelMismatchedFutureLessons(group, weeksAhead = WEEKS_AHEAD) {
  const schedule = parseSchedule(group.schedule);
  if (!schedule) return { cancelled: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateStr(today);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + weeksAhead * 7);

  // Все будущие занятия группы
  const lessons = await Lesson.findAll({
    where: {
      groupId: group.id,
      date: { [Op.gte]: todayStr },
      is_cancelled: false,
    },
  });

  // Множество допустимых слотов: 'YYYY-MM-DD|HH:MM:SS'
  const validSlots = new Set();
  for (let offset = 0; offset < weeksAhead * 7; offset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    const dayName = DAY_NAMES[date.getDay()];
    const slots = schedule[dayName];
    if (!slots) continue;
    const dateStr = formatDateStr(date);
    for (const s of slots) {
      validSlots.add(`${dateStr}|${s.start}`);
    }
  }

  let cancelled = 0;
  for (const lesson of lessons) {
    const key = `${lesson.date}|${lesson.startTime}`;
    if (!validSlots.has(key)) {
      await lesson.update({ is_cancelled: true });
      cancelled += 1;
    }
  }
  return { cancelled };
}

// ---------- Cron ----------

function registerRecurringLessonsJob() {
  // Ежедневно в 02:00. TTL 1 час — защита от зависшего лока.
  cron.schedule('0 2 * * *', withLock('cron:recurring-lessons', 3600, async () => {
    console.log('[recurring] Generating lessons for all groups...');
    try {
      const groups = await Group.findAll({
        where: { schedule: { [Op.ne]: null } },
      });

      let totalCreated = 0;
      let totalSkipped = 0;

      for (const group of groups) {
        const { created, skipped } = await generateLessonsForGroup(group);
        totalCreated += created;
        totalSkipped += skipped;
      }

      console.log(
        `[recurring] Done. Groups=${groups.length}, created=${totalCreated}, skipped=${totalSkipped}.`
      );
    } catch (e) {
      console.error('[recurring] Job failed:', e);
    }
  }));

  console.log('[recurring] Cron registered (daily at 02:00, with lock).');
}

module.exports = {
  generateLessonsForGroup,
  cancelMismatchedFutureLessons,
  registerRecurringLessonsJob,
  parseSchedule,
  WEEKS_AHEAD,
};