const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const childRoutes = require('./routes/childRoutes');
const courseRoutes = require('./routes/courseRoutes');
const groupRoutes = require('./routes/groupRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const errorHandler = require('./utils/errorHandler');
const logger = require('./utils/logger');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/children', childRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/schedule', scheduleRoutes);

// Сообщения и уведомления (если есть)
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// 👇 ИСПРАВЛЕНО: админские роуты теперь тоже через /api/admin
app.use('/api/admin', require('./routes/adminRoutes'));

// Health check
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Подключаем сокеты
require('./sockets/chatSocket')(io);

// Подключаем cron
require('./jobs/reminderJob');

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database synced.');
    }
    server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
});
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
};

start();