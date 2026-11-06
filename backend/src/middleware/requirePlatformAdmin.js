/**
 * Строже, чем roleCheck('platform_admin'):
 * смотрит на РЕАЛЬНУЮ роль пользователя, а не на effectiveRole.
 * Нужен для /api/platform/*, чтобы имперсонация не давала доступ к управлению
 * платформой.
 */
module.exports = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (req.user.role !== 'platform_admin') {
    return res.status(403).json({ message: 'Forbidden: platform admin only' });
  }
  next();
};