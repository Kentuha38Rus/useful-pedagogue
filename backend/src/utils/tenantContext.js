const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

/**
 * Запускает выполнение callback в контексте тенанта.
 * Используется в middleware.
 */
function runWithTenant(tenantId, callback) {
  return storage.run({ tenantId: tenantId || null }, callback);
}

/**
 * Возвращает текущий tenantId из контекста (или null).
 */
function getCurrentTenantId() {
  const store = storage.getStore();
  return store ? store.tenantId : null;
}

module.exports = { runWithTenant, getCurrentTenantId };