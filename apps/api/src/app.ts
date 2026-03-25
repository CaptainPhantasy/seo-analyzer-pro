/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { redis } from './lib/redis.js';

// Routes
import authRoutes from './routes/auth.js';
import sitesRoutes from './routes/sites.js';
import scansRoutes from './routes/scans.js';
import usersRoutes from './routes/users.js';
import organizationsRoutes from './routes/organizations.js';
import billingRoutes from './routes/billing.js';
import webhooksRoutes from './routes/webhooks.js';
import integrationsRoutes from './routes/integrations.js';

// Middleware
import { authMiddleware } from './middleware/auth.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: false, // We use our own pino logger
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  }).withTypeProvider<ZodTypeProvider>();

  // Set custom validators/serializers for Zod
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Register security middleware
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
        scriptSrc: ["'self'"],
      },
    },
  });

  // CORS configuration
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  // JWT authentication
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  // Cookie support
  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'cookie-secret-change-in-production',
    hook: 'onRequest',
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    cache: 10000,
    allowList: ['127.0.0.1'],
    redis: redis,
    nameSpace: 'seo-analyzer-rate-limit:',
    continueExceeding: true,
    skipOnError: true,
  });

  // OpenAPI/Swagger documentation
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'SEO Analyzer Pro API',
        description:
          'Enterprise-grade SEO & GEO Analysis Platform API. Analyze websites, track competitors, and optimize for search engines and AI assistants.',
        version: '1.0.0',
        contact: {
          name: 'Legacy AI / Floyd\'s Labs',
          url: 'https://www.LegacyAI.space',
          email: 'support@legacyai.space',
        },
        license: {
          name: 'Proprietary',
          url: 'https://www.legacyai.space/license',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
        {
          url: 'https://api.seoanalyzer.pro',
          description: 'Production server',
        },
      ],
      tags: [
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'sites', description: 'Site management' },
        { name: 'scans', description: 'SEO scan operations' },
        { name: 'users', description: 'User management' },
        { name: 'organizations', description: 'Organization management' },
        { name: 'billing', description: 'Billing and subscription' },
        { name: 'integrations', description: 'Third-party integrations' },
        { name: 'webhooks', description: 'Webhook endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Health check endpoint
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }));

  // Register authentication middleware decorator
  fastify.decorate('authenticate', authMiddleware);

  // Register routes
  await fastify.register(authRoutes, { prefix: '/auth' });
  await fastify.register(sitesRoutes, { prefix: '/sites' });
  await fastify.register(scansRoutes, { prefix: '/scans' });
  await fastify.register(usersRoutes, { prefix: '/users' });
  await fastify.register(organizationsRoutes, { prefix: '/organizations' });
  await fastify.register(billingRoutes, { prefix: '/billing' });
  await fastify.register(webhooksRoutes, { prefix: '/webhooks' });
  await fastify.register(integrationsRoutes, { prefix: '/integrations' });

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;

    // Log error details
    logger.error({
      error: {
        message: error.message,
        stack: error.stack,
        statusCode,
      },
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
      },
    });

    // Don't expose internal errors in production
    const message =
      statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : error.message;

    return reply.status(statusCode).send({
      success: false,
      error: {
        message,
        code: error.code || 'INTERNAL_ERROR',
        statusCode,
      },
    });
  });

  // Graceful shutdown hook
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    redis.disconnect();
    logger.info('Database and Redis connections closed');
  });

  return fastify;
}

// Type augmentation for Fastify instance
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authMiddleware;
  }
}
