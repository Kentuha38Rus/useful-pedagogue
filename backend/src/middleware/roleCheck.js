/**
 * Проверка роли. Поддерживает оба варианта вызова:
 *   roleCheck('admin')
 *   roleCheck('admin', 'teacher')
 *   roleCheck(['admin', 'teacher'])
 */
const roleCheck = (...args) => {
  // Если первый аргумент — массив, распаковываем
  const allowedRoles =
    args.length === 1 && Array.isArray(args[0]) ? args[0] : args;

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
};

module.exports = roleCheck;