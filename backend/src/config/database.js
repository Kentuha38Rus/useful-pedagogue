require('dotenv').config();

const common = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  dialect: 'postgres',
  logging: false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
};

module.exports = {
  development: { ...common },
  test: { ...common, database: `${common.database}_test` },
  production: {
    ...common,
    ...(process.env.DB_SSL === 'true' && {
      dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    }),
  },
};
