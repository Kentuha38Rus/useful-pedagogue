const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Tenant } = require('../models');
const { Op } = require('sequelize');
const redis = require('../config/redis');
const {
  accessSecret,
  refreshSecret,
  accessExpiresIn,
  refreshExpiresIn,
  algorithm,
} = require('../config/jwt');

const BCRYPT_ROUNDS = 10;

class AuthService {
  async register(userData) {
    const { email, password, name, phone, username, tenantSlug } = userData;
    const role = 'parent';

    if (!tenantSlug) {
      const err = new Error('tenantSlug is required');
      err.status = 400;
      throw err;
    }

    const tenant = await Tenant.findOne({
      where: { slug: String(tenantSlug).toLowerCase().trim() },
    });
    if (!tenant) { const err = new Error('Tenant not found'); err.status = 404; throw err; }
    if (tenant.status !== 'active' && tenant.status !== 'trial') {
      const err = new Error('Tenant is not accepting registrations'); err.status = 403; throw err;
    }

    const normalizedEmail = email ? email.toLowerCase().trim() : null;
    const normalizedUsername = username ? username.toLowerCase().trim() : null;

    if (!normalizedEmail && !normalizedUsername) throw new Error('Email or username is required');

    const conditions = [];
    if (normalizedEmail) conditions.push({ email: normalizedEmail });
    if (normalizedUsername) conditions.push({ username: normalizedUsername });

    const existing = await User.findOne({ where: { [Op.or]: conditions } });
    if (existing) { const err = new Error('User already exists'); err.status = 409; throw err; }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return User.create({
      tenantId: tenant.id,
      email: normalizedEmail,
      username: normalizedUsername,
      passwordHash,
      name,
      phone,
      role,
    });
  }

  async login(identifier, password) {
    if (!identifier || !password) {
      const err = new Error('Invalid credentials'); err.status = 401; throw err;
    }

    const normalized = String(identifier).trim().toLowerCase();

    const user = await User.findOne({
      where: { [Op.or]: [{ username: { [Op.iLike]: normalized } }, { email: { [Op.iLike]: normalized } }] },
      include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'slug', 'name', 'status', 'plan'], required: false }],
    });

    if (!user) { const err = new Error('Invalid credentials'); err.status = 401; throw err; }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) { const err = new Error('Invalid credentials'); err.status = 401; throw err; }

    if (user.role !== 'platform_admin') {
      if (!user.tenant) { const err = new Error('Account has no tenant assigned'); err.status = 403; throw err; }
      if (user.tenant.status !== 'active' && user.tenant.status !== 'trial') {
        const err = new Error('Tenant is suspended'); err.status = 403; throw err;
      }
    }

    const tokens = this.generateTokens(user);
    return { user, tokens };
  }

  generateTokens(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      tid: user.tenantId || null,
      jti: crypto.randomUUID(), // Уникальный ID токена для денлиста
    };
    
    const accessToken = jwt.sign(payload, accessSecret, { expiresIn: accessExpiresIn, algorithm });
    const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: refreshExpiresIn, algorithm });
    
    return { accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      const err = new Error('Invalid refresh token'); err.status = 401; throw err;
    }

    try {
      // Проверяем, не отозван ли токен (по jti или по самому токену для совместимости)
      const decodedRaw = jwt.decode(refreshToken);
      if (decodedRaw && decodedRaw.jti) {
        const revoked = await redis.get(`bl:${decodedRaw.jti}`);
        if (revoked) throw new Error('Revoked');
      }

      const decoded = jwt.verify(refreshToken, refreshSecret, { algorithms: [algorithm] });

      const user = await User.findByPk(decoded.id, {
        include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'slug', 'name', 'status'], required: false }],
      });
      if (!user) { const err = new Error('Invalid refresh token'); err.status = 401; throw err; }

      if (user.role !== 'platform_admin') {
        if (!user.tenant) { const err = new Error('Account has no tenant assigned'); err.status = 403; throw err; }
        if (user.tenant.status !== 'active' && user.tenant.status !== 'trial') {
          const err = new Error('Tenant is suspended'); err.status = 403; throw err;
        }
      }

      // РОТАЦИЯ: Старый refreshToken отправляем в денлист
      const ttl = Math.max(0, (decoded.exp || 0) - Math.floor(Date.now() / 1000));
      if (ttl > 0 && decoded.jti) {
        await redis.set(`bl:${decoded.jti}`, '1', { EX: ttl });
      }

      // Выдаем НОВУЮ пару токенов
      return this.generateTokens(user);
    } catch (e) {
      if (e.status === 401 || e.status === 403) throw e;
      const err = new Error('Invalid refresh token'); err.status = 401; throw err;
    }
  }
}

module.exports = new AuthService();