const Redis = require('ioredis');

/**
 * Redis connection configuration
 * Reads from environment variables:
 * - REDIS_HOST (default: localhost)
 * - REDIS_PORT (default: 6379)
 * - REDIS_PASSWORD (optional)
 * - REDIS_DB (default: 0)
 */
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: null,
});

// Handle connection events
redisConnection.on('connect', () => {
  console.log('[Redis] Connected to Redis');
});

redisConnection.on('ready', () => {
  console.log('[Redis] Redis connection ready');
});

redisConnection.on('error', (err) => {
  console.error('[Redis] Connection error:', err);
});

redisConnection.on('close', () => {
  console.log('[Redis] Connection closed');
});

module.exports = redisConnection;

