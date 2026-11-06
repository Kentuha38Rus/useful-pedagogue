const logger = require('./logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err.stack);

  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Sequelize: уникальность
  if (err.name === 'SequelizeUniqueConstraintError') {
    status = 409;
    message = 'Duplicate entry: ' + (err.errors || []).map((e) => e.path).join(', ');
  }
  // Sequelize: валидация
  if (err.name === 'SequelizeValidationError') {
    status = 400;
    message = (err.errors || []).map((e) => e.message).join('; ');
  }
  // Sequelize: NOT NULL / FK
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    status = 409;
    message = 'Operation violates referential constraints';
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;