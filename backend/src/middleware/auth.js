const jwt = require('jsonwebtoken');
const { accessSecret } = require('../config/jwt');
const { User, Tenant } = require('../models');
const { runWithTenant } = require('../utils/tenantContext');

/**
 * Auth middleware с поддержкой мультитенантности.
 *
 * Устанавливает:
 *   req.user             — модель User (с include: tenant)
 *   req.tenantId         — UUID текущего тенанта (null для platform_admin без X-Tenant-Id)
 *   req.tenant           — модель Tenant или null
 *   req.isPlatformAdmin  — true, если role === 'platform_admin'
 *   req.impersonating    — true, если platform_admin прислал X-Tenant-Id
 *   req.effectiveRole    — 'admin' при имперсонации, иначе undefined
 *                          (используется в roleCheck как override)
 *   req.originalUser     — { id, role } до имперсонации (если имперсонирует)
 *
 * Фаза 3.5: после установки req.tenantId downstream выполняется внутри
 * runWithTenant(req.tenantId, ...) — tenantId доступен через AsyncLocalStorage
 * (для хуков Sequelize, RLS через SET LOCAL app.tenant_id и т.д.).
 */
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, accessSecret);

    const user = await User.findByPk(decoded.id, {
      include: [{
        model: Tenant,
        as: 'tenant',
        attributes: ['id', 'slug', 'name', 'status', 'plan'],
        required: false,
      }],
    });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Sanity: tid из JWT должен совпадать с tenantId в БД.
    // Если не совпал — токен устарел, просим перелогиниться (фронт сделает /refresh).
    const tokenTid = decoded.tid || null;
    const dbTid = user.tenantId || null;
    if (tokenTid !== dbTid) {
      return res.status(401).json({
        message: 'Token tenant mismatch, please re-login',
        code: 'TOKEN_TENANT_MISMATCH',
      });
    }

    // Проверка статуса тенанта (для обычных пользователей)
    if (user.tenantId) {
      if (!user.tenant) {
        return res.status(403).json({ message: 'Tenant not found' });
      }
      if (user.tenant.status !== 'active' && user.tenant.status !== 'trial') {
        return res.status(403).json({
          message: 'Tenant is suspended',
          code: 'TENANT_SUSPENDED',
        });
      }
    }

    req.user = user;

    // ----- Платформенный админ -----
    if (user.role === 'platform_admin') {
      req.isPlatformAdmin = true;
      const headerTenantId = req.headers['x-tenant-id'];

      if (headerTenantId) {
        // Имперсонация: super-admin действует как админ указанного тенанта
        const target = await Tenant.findByPk(headerTenantId);
        if (!target) {
          return res.status(400).json({ message: 'X-Tenant-Id not found' });
        }
        if (target.status !== 'active' && target.status !== 'trial') {
          return res.status(400).json({ message: 'Target tenant is suspended' });
        }
        req.originalUser = { id: user.id, role: user.role };
        req.impersonating = true;
        req.effectiveRole = 'admin';
        req.tenant = target;
        req.tenantId = target.id;
      } else {
        // Обычный режим super-admin (управление тенантами)
        req.tenantId = null;
        req.tenant = null;
      }
      return runWithTenant(req.tenantId, () => next());
    }

    // ----- Обычный пользователь -----
    req.isPlatformAdmin = false;
    req.impersonating = false;
    req.tenantId = user.tenantId;
    req.tenant = user.tenant || null;

    return runWithTenant(req.tenantId, () => next());
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    next(error);
  }
};

module.exports = auth;