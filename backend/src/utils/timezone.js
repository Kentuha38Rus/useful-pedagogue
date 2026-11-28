/**
 * Часовые пояса центров.
 *
 * Важно: дата и время занятия в БД — «настенные» значения центра
 * (Lessons.date — DATEONLY, startTime/endTime — TIME). Поэтому все
 * сравнения «сейчас» нужно делать в поясе центра, а не в поясе сервера
 * (сервер живёт в UTC).
 *
 * Пояс хранится в tenants.settings.timezone (IANA-строка, например
 * "Asia/Irkutsk"). Если настройка не задана или битая — берём Иркутск.
 *
 * Модуль не требует новых зависимостей: всё считается через Intl.
 * Модель Tenant подключается лениво, чтобы чистые функции можно было
 * проверять без БД и без инициализации Sequelize.
 */

const DEFAULT_TIMEZONE = 'Asia/Irkutsk';
const CACHE_TTL_MS = 5 * 60 * 1000;

// tenantId -> { timezone, expiresAt }
const tenantTimezoneCache = new Map();
const formatterCache = new Map();

let tenantModel = null;

function getTenantModel() {
  if (!tenantModel) {
    tenantModel = require('../models').Tenant;
  }
  return tenantModel;
}

function isValidTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    // Бросает RangeError на неизвестный пояс.
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch (_) {
    return false;
  }
}

function normalizeTimeZone(timeZone) {
  return isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
}

function invalidateTenantTimezone(tenantId) {
  if (tenantId) tenantTimezoneCache.delete(String(tenantId));
}

/**
 * Пояс центра. Читается из tenants.settings.timezone с кэшем на 5 минут.
 */
async function getTenantTimezone(tenantId) {
  if (!tenantId) return DEFAULT_TIMEZONE;

  const key = String(tenantId);
  const cached = tenantTimezoneCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.timezone;

  let timezone = DEFAULT_TIMEZONE;
  try {
    const Tenant = getTenantModel();
    const tenant = await Tenant.findByPk(tenantId, {
      attributes: ['id', 'settings'],
    });
    timezone = normalizeTimeZone(tenant && tenant.settings && tenant.settings.timezone);
  } catch (error) {
    console.error('[timezone] не удалось прочитать пояс центра:', error.message);
  }

  tenantTimezoneCache.set(key, {
    timezone,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return timezone;
}

function getPartsFormatter(timeZone) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      })
    );
  }
  return formatterCache.get(timeZone);
}

const pad2 = (value) => String(value).padStart(2, '0');

/**
 * Компоненты даты/времени в поясе центра.
 */
function getZonedParts(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const formatter = getPartsFormatter(normalizeTimeZone(timeZone));
  const parts = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function getZonedDateString(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

function getZonedTimeString(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const p = getZonedParts(date, timeZone);
  return `${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`;
}

/** «Сейчас» в поясе центра в виде строк: { date: 'YYYY-MM-DD', time: 'HH:MM:SS' }. */
function getZonedNow(timeZone = DEFAULT_TIMEZONE, date = new Date()) {
  const tz = normalizeTimeZone(timeZone);
  return {
    date: getZonedDateString(date, tz),
    time: getZonedTimeString(date, tz),
  };
}

/**
 * Окно [сейчас; сейчас + minutesAhead] в поясе центра.
 * Возвращает 1 или 2 диапазона — если окно переходит через полночь.
 */
function getZonedWindow(timeZone, minutesAhead = 60, now = new Date()) {
  const tz = normalizeTimeZone(timeZone);
  const from = getZonedNow(tz, now);
  const to = getZonedNow(tz, new Date(now.getTime() + minutesAhead * 60 * 1000));

  if (from.date === to.date) {
    return [{ date: from.date, from: from.time, to: to.time }];
  }

  return [
    { date: from.date, from: from.time, to: '23:59:59' },
    { date: to.date, from: '00:00:00', to: to.time },
  ];
}

/**
 * Сравнение «настенных» даты+времени. <0 — первый раньше второго.
 */
function compareWallClock(dateA, timeA, dateB, timeB) {
  const left = `${dateA}T${String(timeA || '').slice(0, 8).padEnd(8, '0')}`;
  const right = `${dateB}T${String(timeB || '').slice(0, 8).padEnd(8, '0')}`;
  return left.localeCompare(right);
}

module.exports = {
  DEFAULT_TIMEZONE,
  isValidTimeZone,
  normalizeTimeZone,
  invalidateTenantTimezone,
  getTenantTimezone,
  getZonedParts,
  getZonedDateString,
  getZonedTimeString,
  getZonedNow,
  getZonedWindow,
  compareWallClock,
};
