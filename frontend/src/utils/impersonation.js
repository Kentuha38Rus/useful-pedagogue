/**
 * Режим имперсонации для platform_admin.
 *
 * Источник истины — localStorage (переживает перезагрузку страницы):
 *   impersonateTenantId  — UUID тенанта
 *   impersonateTenantName — имя тенанта (для плашки в Header)
 *
 * api.js читает impersonateTenantId и добавляет X-Tenant-Id ко всем
 * не-auth запросам. Backend в auth middleware подменяет effectiveRole
 * на 'admin' и req.tenantId на UUID тенанта.
 */

const KEY_ID = 'impersonateTenantId';
const KEY_NAME = 'impersonateTenantName';

export const startImpersonation = (tenant) => {
  if (!tenant?.id) throw new Error('tenant.id is required');
  localStorage.setItem(KEY_ID, tenant.id);
  localStorage.setItem(KEY_NAME, tenant.name || tenant.slug || '');
};

export const stopImpersonation = () => {
  localStorage.removeItem(KEY_ID);
  localStorage.removeItem(KEY_NAME);
};

export const getImpersonation = () => {
  const id = localStorage.getItem(KEY_ID);
  if (!id) return null;
  return {
    id,
    name: localStorage.getItem(KEY_NAME) || '',
  };
};

export const isImpersonating = () => !!localStorage.getItem(KEY_ID);