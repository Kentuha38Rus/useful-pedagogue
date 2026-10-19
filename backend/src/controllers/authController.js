const jwt = require('jsonwebtoken');
const authService = require('../services/authService');
const redis = require('../config/redis');
const { refreshSecret } = require('../config/jwt');

exports.register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const identifier = req.body.identifier || req.body.email || req.body.username;
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Identifier (email/username) and password are required',
      });
    }

    const { user, tokens } = await authService.login(identifier, password);
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, refreshSecret);
        const ttl = Math.max(0, (decoded.exp || 0) - Math.floor(Date.now() / 1000));
        if (ttl > 0) {
          // Ключ = префикс + сам токен, значение не важно, TTL = оставшийся срок
          await redis.set(`bl:${refreshToken}`, '1', { EX: ttl });
        }
      } catch (_) {
        // Невалидный/истёкший токен — всё равно отвечаем успехом,
        // чтобы клиент не пытался ретраить logout бесконечно.
      }
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};