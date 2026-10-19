const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const childRoutes = require('./routes/childRoutes');
const courseRoutes = require('./routes/courseRoutes');
const groupRoutes = require('./routes/groupRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const errorHandler = require('./utils/errorHandler');
const logger = require('./utils/logger');

const isProd = process.env.NODE_ENV === 'production';

// ---- CORS ----
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    // Разрешаем запросы без Origin (server-to-server, curl) только в dev
    if (!origin) return cb(null, !isProd);
    if (allowedOrigins.length === 0) {
      return cb(null, !isProd);
    }
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

const app = express();
const server = http.createServer(app);

// За nginx
app.set('trust proxy', 1);

// Socket.IO
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : false,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/socket.io',
});
app.set('io', io);

// ---- Безопасность ----
app.use(helmet({
  // API не отдаёт HTML, CSP не нужен и может ломать интеграции
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Логирование запросов
app.use(morgan(isProd ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// ---- Глобальный rate limiter ----
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests' },
}));

// ---- Health ----
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// ---- Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/children', childRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// ---- Socket.IO ----
require('./sockets/chatSocket')(io);

// ---- Jobs ----
require('./jobs/reminderJob')(io);
const { registerRecurringLessonsJob } = require('./jobs/recurringLessonsJob');
registerRecurringLessonsJob();

// ---- Error handler ----
app.use(errorHandler);

// ---- Start ----
const PORT = Number(process.env.PORT) || 5000;

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

    // В prod — только миграции, не sync alter
    if (!isProd) {
      await sequelize.sync({ alter: true });
      logger.info('Database synced (dev)');
    }

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT} (env=${process.env.NODE_ENV})`);
    });
  } catch (err) {
    logger.error('Unable to start server:', err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down...`);
  server.close(async () => {
    try { await sequelize.close(); } catch (_) {}
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();