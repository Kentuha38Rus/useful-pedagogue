const cron = require('node-cron');
const { Op } = require('sequelize');
const { Group, Lesson } = require('../models');
const { withLock } = require('../utils/distributedLock');
const { getTenantTimezone, getZonedNow } = require('../utils/timezone');

const WEEKS_AHEAD = 4;
const DAY_NAMES = [
  'sunday', 'monday', 'tuesday', 'wednesday',
  'thursday', 'friday', 'saturday',
];

function normalizeTime(t) {
  const [hh, mm] = String(t).split(':');
  return `${String(hh).padStart(2, '0')}:${String(mm || '00').padStart(2, '0')}:00`;
}

function parseSchedule(raw) {
  if (!raw) return null;
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return null; }
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

async function generateLessonsForGroup(group, weeksAhead = WEEKS_AHEAD) {
  const schedule = parseSchedule(group.schedule);
  if (!schedule) return { created: 0, skipped: 0 };

  // «Сегодня» и «уже началось» — по поясу центра, а не по часам сервера.
  const timezone = await getTenantTimezone(group.tenantId);
  const nowZoned = getZonedNow(timezone);
  const [year, month, day] = nowZoned.date.split('-').map(Number);

  // Якорь в UTC-полночь: прибавляем дни, не завися от пояса сервера.
  const today = new Date(Date.UTC(year, month - 1, day));
  const totalDays = weeksAhead * 7;

  let created = 0;
  let skipped = 0;

  for (let offset = 0; offset < totalDays; offset++) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + offset);
    const dayName = DAY_NAMES[date.getUTCDay()];
    const slots = schedule[dayName];
    if (!slots) continue;

    const dateStr = date.toISOString().slice(0, 10);

    for (const slot of slots) {
      // Сегодняшние занятия, которые уже начались, не создаём.
      if (offset === 0 && slot.start <= nowZoned.time) {
        skipped += 1;
        continue;
      }

      try {
        const [, isCreated] = await Lesson.findOrCreate({
          where: {
            groupId: group.id,
            date: dateStr,
            startTime: slot.start,
          },
          defaults: {
            tenantId: group.tenantId,
            endTime: slot.end,
            is_cancelled: false,
          },
        });
        if (isCreated) created += 1;
        else skipped += 1;
      } catch (e) {
        skipped += 1;
      }
    }
  }

  return { created, skipped };
}

async function cancelMismatchedFutureLessons(group, weeksAhead = WEEKS_AHEAD) {
  const schedule = parseSchedule(group.schedule);
  if (!schedule) return { cancelled: 0 };

  const timezone = await getTenantTimezone(group.tenantId);
  const nowZoned = getZonedNow(timezone);
  const todayStr = nowZoned.date;
  const [year, month, day] = todayStr.split('-').map(Number);

  const today = new Date(Date.UTC(year, month - 1, day));

  const lessons = await Lesson.findAll({
    where: {
      tenantId: group.tenantId,
      groupId: group.id,
      date: { [Op.gte]: todayStr },
      is_cancelled: false,
    },
  });

  const validSlots = new Set();
  for (let offset = 0; offset < weeksAhead * 7; offset++) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + offset);
    const dayName = DAY_NAMES[date.getUTCDay()];
    const slots = schedule[dayName];
    if (!slots) continue;
    const dateStr = date.toISOString().slice(0, 10);
    for (const s of slots) validSlots.add(`${dateStr}|${s.start}`);
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

function registerRecurringLessonsJob() {
  // Раз в час: у центров разные пояса, и «сегодня» у них наступает в разное время.
  cron.schedule('5 * * * *', withLock('cron:recurring-lessons', 1800, async () => {
    console.log('[recurring] Generating lessons for all groups (all tenants)...');
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

  console.log('[recurring] Cron registered (hourly at :05, with lock).');
}

module.exports = {
  generateLessonsForGroup,
  cancelMismatchedFutureLessons,
  registerRecurringLessonsJob,
  parseSchedule,
  WEEKS_AHEAD,
};