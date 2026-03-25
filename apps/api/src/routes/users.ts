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
import { validateBody, validateParams } from '../middleware/validate.js';

// Validation schemas
const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const userParamsSchema = z.object({
  id: z.string().cuid(),
});

const inviteUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['ADMIN', 'MEMBER']),
});

export default async function usersRoutes(fastify: FastifyInstance) {
  /**
   * GET /users
   * List all users in the organization
   */
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate, rateLimits.read],
      schema: {
        tags: ['users'],
        summary: 'List users',
        description: 'Get all users in the organization',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  users: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        name: { type: 'string' },
                        role: { type: 'string' },
                        createdAt: { type: 'string' },
                      },
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
      const orgId = request.user!.orgId;

      const users = await prisma.user.findMany({
        where: { orgId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      return reply.send({
        success: true,
        data: { users },
      });
    }
  );

  /**
   * GET /users/me
   * Get current user profile
   */
  fastify.get(
    '/me',
    {
      preHandler: [fastify.authenticate, rateLimits.read],
      schema: {
        tags: ['users'],
        summary: 'Get current user',
        description: 'Get the authenticated user profile',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                  createdAt: { type: 'string' },
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
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
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
        data: user,
      });
    }
  );

  /**
   * PATCH /users/me
   * Update current user profile
   */
  fastify.patch(
    '/me',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateBody(updateUserSchema)],
      schema: {
        tags: ['users'],
        summary: 'Update profile',
        description: 'Update the authenticated user profile',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
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
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const updateData = request.body as z.infer<typeof updateUserSchema>;

      // If email is being changed, check if it's already taken
      if (updateData.email && updateData.email !== request.user!.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: updateData.email },
        });

        if (existingUser) {
          return reply.status(409).send({
            success: false,
            error: {
              message: 'Email is already in use',
              code: 'EMAIL_IN_USE',
              statusCode: 409,
            },
          });
        }
      }

      const user = await prisma.user.update({
        where: { id: request.user!.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId: request.user!.orgId,
          userId: request.user!.id,
          action: 'USER_PROFILE_UPDATED',
          details: { changes: updateData },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      return reply.send({
        success: true,
        data: user,
      });
    }
  );

  /**
   * POST /users/me/change-password
   * Change user password
   */
  fastify.post(
    '/me/change-password',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateBody(changePasswordSchema)],
      schema: {
        tags: ['users'],
        summary: 'Change password',
        description: 'Change the authenticated user password',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
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
      const { currentPassword, newPassword } = request.body as z.infer<typeof changePasswordSchema>;

      const user = await prisma.user.findUnique({
        where: { id: request.user!.id },
        select: { id: true, passwordHash: true },
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

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

      if (!isValid) {
        return reply.status(401).send({
          success: false,
          error: {
            message: 'Current password is incorrect',
            code: 'INVALID_PASSWORD',
            statusCode: 401,
          },
        });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId: request.user!.orgId,
          userId: request.user!.id,
          action: 'PASSWORD_CHANGED',
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      logger.info({ userId: user.id }, 'Password changed');

      return reply.send({
        success: true,
        message: 'Password changed successfully',
      });
    }
  );

  /**
   * POST /users/invite
   * Invite a new user to the organization (admin only)
   */
  fastify.post(
    '/invite',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateBody(inviteUserSchema)],
      schema: {
        tags: ['users'],
        summary: 'Invite user',
        description: 'Invite a new user to the organization (requires ADMIN or OWNER role)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['email', 'name', 'role'],
          properties: {
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['ADMIN', 'MEMBER'] },
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
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // Check if user has permission to invite
      if (!['OWNER', 'ADMIN'].includes(request.user!.role)) {
        return reply.status(403).send({
          success: false,
          error: {
            message: 'Only admins can invite users',
            code: 'FORBIDDEN',
            statusCode: 403,
          },
        });
      }

      const { email, name, role } = request.body as z.infer<typeof inviteUserSchema>;
      const orgId = request.user!.orgId;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return reply.status(409).send({
          success: false,
          error: {
            message: 'User with this email already exists',
            code: 'USER_EXISTS',
            statusCode: 409,
          },
        });
      }

      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-12);
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          role,
          orgId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId,
          userId: request.user!.id,
          action: 'USER_INVITED',
          details: { invitedUserId: user.id, email, role },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      logger.info({ userId: user.id, invitedBy: request.user!.id }, 'User invited');

      // In production, send email with temporary password
      // await emailQueue.add('send-invitation', { email, name, tempPassword });

      return reply.status(201).send({
        success: true,
        data: user,
        // Include temp password in development only
        ...(process.env.NODE_ENV === 'development' && { tempPassword }),
      });
    }
  );

  /**
   * DELETE /users/:id
   * Remove a user from the organization (owner only)
   */
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateParams(userParamsSchema)],
      schema: {
        tags: ['users'],
        summary: 'Remove user',
        description: 'Remove a user from the organization (requires OWNER role)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
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
      const { id } = request.params as z.infer<typeof userParamsSchema>;

      // Only owners can remove users
      if (request.user!.role !== 'OWNER') {
        return reply.status(403).send({
          success: false,
          error: {
            message: 'Only owners can remove users',
            code: 'FORBIDDEN',
            statusCode: 403,
          },
        });
      }

      // Cannot remove yourself
      if (id === request.user!.id) {
        return reply.status(400).send({
          success: false,
          error: {
            message: 'Cannot remove yourself',
            code: 'CANNOT_REMOVE_SELF',
            statusCode: 400,
          },
        });
      }

      // Verify user is in the same org
      const userToRemove = await prisma.user.findFirst({
        where: { id, orgId: request.user!.orgId },
      });

      if (!userToRemove) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND',
            statusCode: 404,
          },
        });
      }

      // Delete user
      await prisma.user.delete({
        where: { id },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId: request.user!.orgId,
          userId: request.user!.id,
          action: 'USER_REMOVED',
          details: { removedUserId: id, email: userToRemove.email },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      logger.info({ removedUserId: id, removedBy: request.user!.id }, 'User removed');

      return reply.send({
        success: true,
        message: 'User removed successfully',
      });
    }
  );
}
