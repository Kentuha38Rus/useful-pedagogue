/**
 * Хелперы для мультитенантности (Фаза 3 будет активно использовать).
 */

/**
 * Вернуть tenantId из запроса или бросить 400.
 * Используется в контроллерах, где tenant обязателен.
 */
const requireTenant = (req) => {
  if (!req.tenantId) {
    const err = new Error('Tenant context required');
    err.status = 400;
    throw err;
  }
  return req.tenantId;
};

/**
 * Универсальный фильтр для Sequelize `where`.
 *   const where = { ...getTenantFilter(req), parentId: req.user.id };
 */
const getTenantFilter = (req) => ({ tenantId: requireTenant(req) });

module.exports = { requireTenant, getTenantFilter };