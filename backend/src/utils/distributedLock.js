const crypto = require('crypto');
const redis = require('../config/redis');
const logger = require('./logger');

// Атомарное снятие лока: удаляем только если значение совпадает с нашим токеном.
// Иначе можем снять чужой лок, если наш уже истёк по TTL и его перехватил другой инстанс.
const RELEASE_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

/**
 * Пытается взять лок. Возвращает токен или null.
 * @param {string} key — уникальный ключ лока
 * @param {number} ttlSec — время жизни лока в секундах (автоснятие при падении)
 */
async function acquireLock(key, ttlSec) {
  try {
    const token = crypto.randomUUID();
    const result = await redis.set(key, token, { NX: true, EX: ttlSec });
    if (result === 'OK') return token;
    return null;
  } catch (e) {
    logger.error(`[lock] acquire failed for ${key}: ${e.message}`);
    return null;
  }
}

/**
 * Освобождает лок. Безопасно: удаляет только если владелец — наш токен.
 */
async function releaseLock(key, token) {
  if (!token) return;
  try {
    await redis.eval(RELEASE_SCRIPT, { keys: [key], arguments: [token] });
  } catch (e) {
    logger.error(`[lock] release failed for ${key}: ${e.message}`);
  }
}

/**
 * Оборачивает функцию в distributed lock.
 * Если лок занят другим инстансом — вызов молча пропускается.
 * Если функция упала — лок всё равно освобождается.
 */
function withLock(lockKey, ttlSec, fn) {
  return async (...args) => {
    const token = await acquireLock(lockKey, ttlSec);
    if (!token) {
      logger.debug(`[lock] ${lockKey} held by another instance, skipping`);
      return;
    }
    try {
      await fn(...args);
    } catch (e) {
      logger.error(`[lock] job ${lockKey} failed: ${e.message}`, { stack: e.stack });
    } finally {
      await releaseLock(lockKey, token);
    }
  };
}

module.exports = { acquireLock, releaseLock, withLock };