const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const isProd = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: isProd ? false : (msg) => logger.debug(msg),
    pool: {
      max: Number(process.env.DB_POOL_MAX) || 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: isProd && process.env.DB_SSL === 'true' ? {
      ssl: { require: true, rejectUnauthorized: false },
    } : undefined,
  }
);

module.exports = sequelize;