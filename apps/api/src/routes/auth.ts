/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { rateLimits } from '../middleware/rate-limit.js';
import { validateBody } from '../middleware/validate.js';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  organizationName: z.string().min(1, 'Organization name is required').max(100),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export default async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /auth/register
   * Register a new user and create their organization
   */
  fastify.post(
    '/register',
    {
      config: {
        rateLimit: { max: 5, timeWindow: '1 minute' },
      },
      preHandler: [rateLimits.auth, validateBody(registerSchema)],
      schema: {
        tags: ['auth'],
        summary: 'Register a new user',
        description: 'Create a new user account and organization',
        body: {
          type: 'object',
          required: ['email', 'password', 'name', 'organizationName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            name: { type: 'string', minLength: 1, maxLength: 100 },
            organizationName: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      name: { type: 'string' },
                      role: { type: 'string' },
                    },
                  },
                  organization: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                  token: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password, name, organizationName } = request.body as z.infer<typeof registerSchema>;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return reply.status(409).send({
          success: false,
          error: {
            message: 'An account with this email already exists',
            code: 'EMAIL_EXISTS',
            statusCode: 409,
          },
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create organization and user in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create organization
        const organization = await tx.organization.create({
          data: {
            name: organizationName,
            plan: 'FREE',
            settings: {
              features: ['basic_scans'],
              limits: {
                sites: 1,
                scansPerMonth: 10,
                competitors: 0,
              },
            },
          },
        });

        // Create user as owner
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            name,
            role: 'OWNER',
            orgId: organization.id,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            orgId: true,
          },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            orgId: organization.id,
            userId: user.id,
            action: 'USER_REGISTERED',
            details: { email, name },
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
          },
        });

        return { user, organization };
      });

      // Generate JWT token
      const token = fastify.jwt.sign(
        {
          userId: result.user.id,
          email: result.user.email,
          role: result.user.role,
          orgId: result.user.orgId,
        },
        { expiresIn: '7d' }
      );

      // Set cookie
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      logger.info({ userId: result.user.id, email }, 'User registered');

      return reply.status(201).send({
        success: true,
        data: {
          user: result.user,
          organization: {
            id: result.organization.id,
            name: result.organization.name,
          },
          token,
        },
      });
    }
  );

  /**
   * POST /auth/login
   * Authenticate user and return token
   */
  fastify.post(
    '/login',
    {
      config: {
        rateLimit: { max: 5, timeWindow: '1 minute' },
      },
      preHandler: [rateLimits.auth, validateBody(loginSchema)],
      schema: {
        tags: ['auth'],
        summary: 'Login',
        description: 'Authenticate user and receive access token',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      name: { type: 'string' },
                      role: { type: 'string' },
                    },
                  },
                  token: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as z.infer<typeof loginSchema>;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              plan: true,
            },
          },
        },
      });

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
            statusCode: 401,
          },
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);

      if (!isValidPassword) {
        return reply.status(401).send({
          success: false,
          error: {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
            statusCode: 401,
          },
        });
      }

      // Generate JWT token
      const token = fastify.jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          orgId: user.orgId,
        },
        { expiresIn: '7d' }
      );

      // Set cookie
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId: user.orgId,
          userId: user.id,
          action: 'USER_LOGIN',
          details: { email },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      logger.info({ userId: user.id, email }, 'User logged in');

      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          organization: user.organization,
          token,
        },
      });
    }
  );

  /**
   * POST /auth/logout
   * Logout user and clear session
   */
  fastify.post(
    '/logout',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Logout',
        description: 'Logout user and clear session cookie',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // Create audit log
      if (request.user) {
        await prisma.auditLog.create({
          data: {
            orgId: request.user.orgId,
            userId: request.user.id,
            action: 'USER_LOGOUT',
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
          },
        });

        logger.info({ userId: request.user.id }, 'User logged out');
      }

      // Clear cookie
      reply.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      return reply.send({
        success: true,
        message: 'Logged out successfully',
      });
    }
  );

  /**
   * GET /auth/me
   * Get current authenticated user
   */
  fastify.get(
    '/me',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Get current user',
        description: 'Get the currently authenticated user profile',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      name: { type: 'string' },
                      role: { type: 'string' },
                    },
                  },
                  organization: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      plan: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user!.id },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              plan: true,
              settings: true,
            },
          },
        },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND',
            statusCode: 404,
          },
        });
      }

      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          organization: user.organization,
        },
      });
    }
  );

  /**
   * POST /auth/refresh
   * Refresh authentication token
   */
  fastify.post(
    '/refresh',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Refresh token',
        description: 'Refresh the authentication token',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // Generate new JWT token
      const token = fastify.jwt.sign(
        {
          userId: request.user!.id,
          email: request.user!.email,
          role: request.user!.role,
          orgId: request.user!.orgId,
        },
        { expiresIn: '7d' }
      );

      // Set cookie
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return reply.send({
        success: true,
        data: { token },
      });
    }
  );
}
