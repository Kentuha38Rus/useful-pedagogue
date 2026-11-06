/**
 * Проверка роли. Поддерживает оба варианта вызова:
 *   roleCheck('admin')
 *   roleCheck('admin', 'teacher')
 *   roleCheck(['admin', 'teacher'])
 *
 * Если req.effectiveRole установлен (имперсонация платформенным админом),
 * используется он, а не req.user.role.
 */
const roleCheck = (...args) => {
  const allowedRoles =
    args.length === 1 && Array.isArray(args[0]) ? args[0] : args;

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const role = req.effectiveRole || req.user.role;
    if (!allowedRoles.includes(role)) {
      return res
        .status(403)
        .json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
};

module.exports = roleCheck;