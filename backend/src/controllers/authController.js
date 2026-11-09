const jwt = require('jsonwebtoken');
const authService = require('../services/authService');
const redis = require('../config/redis');
const { refreshSecret, algorithm } = require('../config/jwt');
const { Tenant } = require('../models');

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
  });
};

exports.register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    const tenant = await Tenant.findByPk(user.tenantId, { attributes: ['id', 'slug', 'name'] });
    res.status(201).json({
      success: true,
      user: {
        id: user.id, username: user.username, email: user.email, name: user.name,
        role: user.role, tenantId: user.tenantId,
        tenantSlug: tenant ? tenant.slug : null, tenantName: tenant ? tenant.name : null,
      },
    });
  } catch (error) { next(error); }
};

exports.login = async (req, res, next) => {
  try {
    const identifier = req.body.identifier || req.body.email || req.body.username;
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Identifier and password are required' });
    }

    const { user, tokens } = await authService.login(identifier, password);

    // Ставим refreshToken в httpOnly cookie
    setRefreshTokenCookie(res, tokens.refreshToken);

    res.json({
      success: true,
      user: {
        id: user.id, username: user.username, email: user.email, name: user.name,
        role: user.role, tenantId: user.tenantId,
        tenantSlug: user.tenant ? user.tenant.slug : null, tenantName: user.tenant ? user.tenant.name : null,
        isPlatformAdmin: user.role === 'platform_admin',
      },
      accessToken: tokens.accessToken, // Возвращаем только accessToken
    });
  } catch (error) { next(error); }
};

exports.refresh = async (req, res, next) => {
  try {
    // Берем токен из cookie, либо из body (для обратной совместимости)
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    
    // authService.refreshAccessToken теперь возвращает ОБА токена
    const newTokens = await authService.refreshAccessToken(refreshToken);
    
    // Обновляем cookie с новым refreshToken
    setRefreshTokenCookie(res, newTokens.refreshToken);
    
    res.json({ success: true, accessToken: newTokens.accessToken });
  } catch (error) { next(error); }
};

exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, refreshSecret, { algorithms: [algorithm] });
        const ttl = Math.max(0, (decoded.exp || 0) - Math.floor(Date.now() / 1000));
        if (ttl > 0 && decoded.jti) {
          await redis.set(`bl:${decoded.jti}`, '1', { EX: ttl });
        }
      } catch (_) {}
    }

    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) { next(error); }
};