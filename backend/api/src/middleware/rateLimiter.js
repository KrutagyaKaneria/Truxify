import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/db.js';
import logger from './logger.js';

function buildStore(prefix) {
  if (!redisClient) {
    logger.warn('Redis unavailable. Falling back to memory rate limiter.');
    return undefined;
  }
  return new RedisStore({
    prefix,
    sendCommand: (command, ...args) => redisClient.call(command, ...args),
  });
}

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('rl:global:'),
  message: { error: 'Rate limit exceeded', retryAfter: 900 },
  skip: (req) => req.path === '/health' || req.path.startsWith('/health/'),
});

export const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('rl:health:'),
  message: { error: 'Rate limit exceeded', retryAfter: 60 },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('rl:auth:'),
  message: { error: 'Rate limit exceeded', retryAfter: 3600 },
});

export const bidLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.uid ?? ipKeyGenerator(req),
  store: buildStore('rl:bid:'),
  message: { error: 'Rate limit exceeded', retryAfter: 60 },
});
