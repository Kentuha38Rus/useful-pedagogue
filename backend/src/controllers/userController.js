const { User } = require('../models');
const { requireTenant } = require('../utils/helpers');

/**
 * GET /api/users/me
 *
 * Возвращает текущего пользователя.
 * Специально для мультитенантности:
 *   - tenantSlug, tenantName — из req.tenant (его ставит auth middleware,
 *     учитывая X-Tenant-Id при имперсонации platform_admin);
 *   - impersonating — true, если platform_admin действует от лица тенанта;
 *   - effectiveRole — 'admin' при имперсонации, иначе user.role.
 *
 * Фронт использует это, чтобы:
 *   - показать название школы в Header;
 *   - отрисовать плашку «Режим имперсонации»;
 *   - корректно проверять роли (PrivateRoute по effectiveRole).
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = req.user;
    const { passwordHash, ...userData } = user.toJSON();

    // При имперсонации req.tenant — это target-тенант, а user.tenant
    // (ассоциация User.belongsTo(Tenant)) — null, потому что у
    // platform_admin tenantId = null.
    const effectiveTenant = req.tenant || user.tenant || null;

    res.json({
      ...userData,
      tenantId: effectiveTenant?.id || userData.tenantId,
      tenantSlug: effectiveTenant?.slug || null,
      tenantName: effectiveTenant?.name || null,
      isPlatformAdmin: user.role === 'platform_admin',
      impersonating: !!req.impersonating,
      effectiveRole: req.effectiveRole || user.role,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/me
 * Обновление своего профиля. Не трогает tenantId/role (только name, phone, email).
 */
exports.updateMe = async (req, res, next) => {
  try {
    const user = req.user;
    const { name, phone, email } = req.body;

    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    await user.update({ name, phone, email });
    const { passwordHash, ...userData } = user.toJSON();
    res.json(userData);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/teachers
 * Список учителей текущего тенанта (только admin).
 * Требует tenant context — имперсонация тоже проходит (req.tenantId = target).
 */
exports.getTeachers = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const teachers = await User.findAll({
      where: { role: 'teacher', tenantId: tid },
      attributes: { exclude: ['passwordHash'] },
    });
    res.json(teachers);
  } catch (error) {
    next(error);
  }
};