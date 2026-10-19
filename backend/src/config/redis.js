require('dotenv').config();
const redis = require('redis');
const logger = require('../utils/logger');

const url = process.env.REDIS_URL
  || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

const client = redis.createClient({ url });

client.on('error', (err) => logger.error('Redis error:', err.message));
client.on('connect', () => logger.info('Redis connected'));
client.on('reconnecting', () => logger.warn('Redis reconnecting'));

let connectPromise = null;
const ensureConnected = () => {
  if (!connectPromise) {
    connectPromise = client.connect().catch((e) => {
      logger.error('Redis connect failed:', e.message);
      connectPromise = null;
      throw e;
    });
  }
  return connectPromise;
};

module.exports = client;
module.exports.ensureConnected = ensureConnected;

// Автоподключение при загрузке (не блокирующее)
ensureConnected().catch(() => {});