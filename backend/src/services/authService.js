const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { Op } = require('sequelize');
const {
  accessSecret,
  refreshSecret,
  accessExpiresIn,
  refreshExpiresIn,
} = require('../config/jwt');

const BCRYPT_ROUNDS = 10;

class AuthService {
  async register(userData) {
    const { email, password, name, phone, username } = userData;

    // ⚠️ роль здесь НЕ принимается — публичная регистрация всегда parent.
    // Других пользователей создаёт админ через /api/admin/users.
    const role = 'parent';

    const normalizedEmail = email ? email.toLowerCase().trim() : null;
    const normalizedUsername = username ? username.toLowerCase().trim() : null;

    if (!normalizedEmail && !normalizedUsername) {
      throw new Error('Email or username is required');
    }

    const conditions = [];
    if (normalizedEmail) conditions.push({ email: normalizedEmail });
    if (normalizedUsername) conditions.push({ username: normalizedUsername });

    const existing = await User.findOne({ where: { [Op.or]: conditions } });
    if (existing) {
      const err = new Error('User already exists');
      err.status = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return User.create({
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
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }

    const normalized = String(identifier).trim().toLowerCase();

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: { [Op.iLike]: normalized } },
          { email: { [Op.iLike]: normalized } },
        ],
      },
    });

    // Не палим, что именно неверно — всегда одно сообщение
    if (!user) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }

    const tokens = this.generateTokens(user);
    return { user, tokens };
  }

  generateTokens(user) {
    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, accessSecret, { expiresIn: accessExpiresIn });
    const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: refreshExpiresIn });
    return { accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, refreshSecret);
      const user = await User.findByPk(decoded.id);
      if (!user) {
        const err = new Error('Invalid refresh token');
        err.status = 401;
        throw err;
      }
      const payload = { id: user.id, email: user.email, role: user.role };
      const accessToken = jwt.sign(payload, accessSecret, { expiresIn: accessExpiresIn });
      return { accessToken };
    } catch (e) {
      const err = new Error('Invalid refresh token');
      err.status = 401;
      throw err;
    }
  }
}

module.exports = new AuthService();