/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

interface RateLimitConfig {
  max: number;
  windowMs: number;
  keyGenerator?: (request: FastifyRequest) => string;
  skip?: (request: FastifyRequest) => boolean;
}

/**
 * Custom rate limiting middleware with Redis backend
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { max, windowMs, keyGenerator, skip } = config;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Skip rate limiting if condition is met
    if (skip?.(request)) {
      return;
    }

    // Generate rate limit key
    const key = keyGenerator
      ? keyGenerator(request)
      : `rate-limit:${request.ip}:${request.routerPath || request.url}`;

    try {
      const current = await redis.incr(key);

      // Set expiry on first request
      if (current === 1) {
        await redis.pexpire(key, windowMs);
      }

      // Get TTL for remaining time
      const ttl = await redis.pttl(key);

      // Set rate limit headers
      reply.header('X-RateLimit-Limit', max);
      reply.header('X-RateLimit-Remaining', Math.max(0, max - current));
      reply.header('X-RateLimit-Reset', Date.now() + ttl);

      if (current > max) {
        logger.warn({ key, current, max }, 'Rate limit exceeded');

        reply.header('Retry-After', Math.ceil(ttl / 1000));

        return reply.status(429).send({
          success: false,
          error: {
            message: 'Too many requests, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
            statusCode: 429,
            retryAfter: Math.ceil(ttl / 1000),
          },
        });
      }
    } catch (error) {
      logger.error({ error }, 'Rate limiter error');
      // Allow request to proceed if rate limiter fails
    }
  };
}

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimits = {
  // Strict limits for authentication endpoints
  auth: createRateLimiter({
    max: 10,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (req) => `auth-limit:${req.ip}`,
  }),

  // Moderate limits for API endpoints
  api: createRateLimiter({
    max: 100,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (req) => `api-limit:${req.user?.id || req.ip}`,
  }),

  // Relaxed limits for read operations
  read: createRateLimiter({
    max: 300,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (req) => `read-limit:${req.user?.id || req.ip}`,
  }),

  // Strict limits for write operations
  write: createRateLimiter({
    max: 50,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (req) => `write-limit:${req.user?.id || req.ip}`,
  }),

  // Very strict limits for scan operations (resource intensive)
  scan: createRateLimiter({
    max: 10,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (req) => `scan-limit:${req.user?.id || req.ip}`,
  }),

  // Limits for webhook endpoints
  webhook: createRateLimiter({
    max: 1000,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (req) => `webhook-limit:${req.ip}`,
  }),
};

/**
 * Sliding window rate limiter for more accurate limiting
 */
export function createSlidingWindowLimiter(config: RateLimitConfig) {
  const { max, windowMs, keyGenerator, skip } = config;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (skip?.(request)) {
      return;
    }

    const key = keyGenerator
      ? keyGenerator(request)
      : `sliding-limit:${request.ip}:${request.routerPath || request.url}`;

    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Use Redis transaction for atomic operations
      const results = await redis
        .multi()
        .zremrangebyscore(key, '-inf', windowStart)
        .zcard(key)
        .zadd(key, now, `${now}-${Math.random()}`)
        .pexpire(key, windowMs)
        .exec();

      const count = results?.[1]?.[1] as number;

      reply.header('X-RateLimit-Limit', max);
      reply.header('X-RateLimit-Remaining', Math.max(0, max - count - 1));
      reply.header('X-RateLimit-Reset', now + windowMs);

      if (count >= max) {
        logger.warn({ key, count, max }, 'Sliding window rate limit exceeded');

        return reply.status(429).send({
          success: false,
          error: {
            message: 'Too many requests, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
            statusCode: 429,
          },
        });
      }
    } catch (error) {
      logger.error({ error }, 'Sliding window rate limiter error');
    }
  };
}
