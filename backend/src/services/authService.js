const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { Op } = require('sequelize'); // ← добавлен импорт
const { accessSecret, refreshSecret, accessExpiresIn, refreshExpiresIn } = require('../config/jwt');

class AuthService {
  async register(userData) {
    const { email, password, name, phone, role = 'parent' } = userData;
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw new Error('User already exists');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, name, phone, role });
    return user;
  }

  // ✅ Метод login теперь поддерживает как username, так и email
  async login(identifier, password) {
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: identifier },
          { email: identifier }
        ]
      }
    });
    if (!user) {
      throw new Error('Invalid credentials');
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
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

  refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, refreshSecret);
      const user = User.findByPk(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }
      const payload = { id: user.id, email: user.email, role: user.role };
      const newAccessToken = jwt.sign(payload, accessSecret, { expiresIn: accessExpiresIn });
      return { accessToken: newAccessToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
}

module.exports = new AuthService();