#!/usr/bin/env node
/**
 * Одноразовый бутстрап: создать первого platform_admin.
 *
 * Запуск:
 *   cd backend
 *   node scripts/create-platform-admin.js
 *
 * Повторный запуск заблокирован (--force для override).
 * Пароль можно передать через env PLATFORM_ADMIN_PASSWORD (для CI/автоматизации).
 */

require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../src/models');

const prompt = (question) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer);
  }));
};

(async () => {
  try {
    await sequelize.authenticate();

    const existing = await User.count({ where: { role: 'platform_admin' } });
    if (existing > 0 && !process.argv.includes('--force')) {
      console.log(`⚠️  Уже существует platform_admin: ${existing}.`);
      console.log('   Для добавления ещё одного запустите с флагом --force.');
      process.exit(0);
    }

    const email = (await prompt('Email: ')).trim().toLowerCase();
    const name = (await prompt('Name: ')).trim();
    const password = process.env.PLATFORM_ADMIN_PASSWORD || (await prompt('Password: '));

    if (!email || !name || !password) {
      console.error('❌ Все поля обязательны');
      process.exit(1);
    }
    if (password.length < 8) {
      console.error('❌ Пароль должен быть не короче 8 символов');
      process.exit(1);
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      console.error('❌ Email уже занят');
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      tenantId: null,
      email,
      username: null,
      passwordHash,
      name,
      phone: null,
      role: 'platform_admin',
    });

    console.log(`✅ platform_admin создан: ${user.email} (id=${user.id})`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Ошибка:', e.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();