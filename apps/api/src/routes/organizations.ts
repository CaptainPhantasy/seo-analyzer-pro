/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { rateLimits } from '../middleware/rate-limit.js';
import { validateBody } from '../middleware/validate.js';

// Validation schemas
const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  settings: z
    .object({
      notifications: z
        .object({
          email: z.boolean().optional(),
          slack: z.boolean().optional(),
        })
        .optional(),
      scanSettings: z
        .object({
          autoScan: z.boolean().optional(),
          defaultFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
        })
        .optional(),
    })
    .optional(),
});

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
});

const scheduledScanSchema = z.object({
  siteId: z.string().cuid(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  enabled: z.boolean().default(true),
});

const competitorSchema = z.object({
  siteId: z.string().cuid(),
  url: z.string().url(),
});

export default async function organizationsRoutes(fastify: FastifyInstance) {
  /**
   * GET /organizations/me
   * Get current organization
   */
  fastify.get(
    '/me',
    {
      preHandler: [fastify.authenticate, rateLimits.read],
      schema: {
        tags: ['organizations'],
        summary: 'Get organization',
        description: 'Get the current organization details',
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
                  name: { type: 'string' },
                  plan: { type: 'string' },
                  settings: { type: 'object' },
                  createdAt: { type: 'string' },
                  _count: {
                    type: 'object',
                    properties: {
                      users: { type: 'number' },
                      sites: { type: 'number' },
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

      const organization = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
          _count: {
            select: {
              users: true,
              sites: true,
            },
          },
        },
      });

      if (!organization) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Organization not found',
            code: 'ORG_NOT_FOUND',
            statusCode: 404,
          },
        });
      }

      return reply.send({
        success: true,
        data: organization,
      });
    }
  );

  /**
   * PATCH /organizations/me
   * Update organization
   */
  fastify.patch(
    '/me',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateBody(updateOrganizationSchema)],
      schema: {
        tags: ['organizations'],
        summary: 'Update organization',
        description: 'Update organization settings (requires ADMIN or OWNER role)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            settings: { type: 'object' },
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
                  name: { type: 'string' },
                  settings: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // Check permissions
      if (!['OWNER', 'ADMIN'].includes(request.user!.role)) {
        return reply.status(403).send({
          success: false,
          error: {
            message: 'Only admins can update organization settings',
            code: 'FORBIDDEN',
            statusCode: 403,
          },
        });
      }

      const updateData = request.body as z.infer<typeof updateOrganizationSchema>;
      const orgId = request.user!.orgId;

      const organization = await prisma.organization.update({
        where: { id: orgId },
        data: updateData,
        select: {
          id: true,
          name: true,
          settings: true,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId,
          userId: request.user!.id,
          action: 'ORGANIZATION_UPDATED',
          details: { changes: updateData },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      return reply.send({
        success: true,
        data: organization,
      });
    }
  );

  /**
   * GET /organizations/me/api-keys
   * List API keys for the current user
   */
  fastify.get(
    '/me/api-keys',
    {
      preHandler: [fastify.authenticate, rateLimits.read],
      schema: {
        tags: ['organizations'],
        summary: 'List API keys',
        description: 'Get all API keys for the current user',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  apiKeys: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        permissions: { type: 'object' },
                        lastUsed: { type: 'string' },
                        createdAt: { type: 'string' },
                        expiresAt: { type: 'string' },
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
      const userId = request.user!.id;

      const apiKeys = await prisma.apiKey.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          permissions: true,
          lastUsed: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        success: true,
        data: { apiKeys },
      });
    }
  );

  /**
   * POST /organizations/me/api-keys
   * Create a new API key
   */
  fastify.post(
    '/me/api-keys',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateBody(createApiKeySchema)],
      schema: {
        tags: ['organizations'],
        summary: 'Create API key',
        description: 'Create a new API key for programmatic access',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            permissions: { type: 'array', items: { type: 'string' } },
            expiresAt: { type: 'string', format: 'date-time' },
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
                  name: { type: 'string' },
                  key: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { name, permissions, expiresAt } = request.body as z.infer<typeof createApiKeySchema>;
      const userId = request.user!.id;

      // Generate API key
      const crypto = await import('crypto');
      const key = `seo_${crypto.randomBytes(32).toString('hex')}`;

      const apiKey = await prisma.apiKey.create({
        data: {
          userId,
          name,
          key,
          permissions: permissions ?? {},
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
        select: {
          id: true,
          name: true,
          key: true,
          createdAt: true,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId: request.user!.orgId,
          userId,
          action: 'API_KEY_CREATED',
          details: { apiKeyId: apiKey.id, name },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      logger.info({ apiKeyId: apiKey.id, userId }, 'API key created');

      return reply.status(201).send({
        success: true,
        data: apiKey,
      });
    }
  );

  /**
   * DELETE /organizations/me/api-keys/:id
   * Revoke an API key
   */
  fastify.delete(
    '/me/api-keys/:id',
    {
      preHandler: [fastify.authenticate, rateLimits.write],
      schema: {
        tags: ['organizations'],
        summary: 'Revoke API key',
        description: 'Revoke an API key',
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
      const { id } = request.params as { id: string };
      const userId = request.user!.id;

      const apiKey = await prisma.apiKey.findFirst({
        where: { id, userId },
      });

      if (!apiKey) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'API key not found',
            code: 'API_KEY_NOT_FOUND',
            statusCode: 404,
          },
        });
      }

      await prisma.apiKey.delete({
        where: { id },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId: request.user!.orgId,
          userId,
          action: 'API_KEY_REVOKED',
          details: { apiKeyId: id, name: apiKey.name },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      return reply.send({
        success: true,
        message: 'API key revoked successfully',
      });
    }
  );

  /**
   * GET /organizations/me/scheduled-scans
   * List scheduled scans
   */
  fastify.get(
    '/me/scheduled-scans',
    {
      preHandler: [fastify.authenticate, rateLimits.read],
      schema: {
        tags: ['organizations'],
        summary: 'List scheduled scans',
        description: 'Get all scheduled scans for the organization',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  scheduledScans: {
                    type: 'array',
                    items: { type: 'object' },
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

      const scheduledScans = await prisma.scheduledScan.findMany({
        where: {
          site: { orgId },
        },
        include: {
          site: {
            select: {
              id: true,
              name: true,
              url: true,
            },
          },
        },
        orderBy: { nextRun: 'asc' },
      });

      return reply.send({
        success: true,
        data: { scheduledScans },
      });
    }
  );

  /**
   * POST /organizations/me/scheduled-scans
   * Create a scheduled scan
   */
  fastify.post(
    '/me/scheduled-scans',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateBody(scheduledScanSchema)],
      schema: {
        tags: ['organizations'],
        summary: 'Create scheduled scan',
        description: 'Create a new scheduled scan',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['siteId', 'frequency'],
          properties: {
            siteId: { type: 'string' },
            frequency: { type: 'string', enum: ['DAILY', 'WEEKLY', 'MONTHLY'] },
            enabled: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { siteId, frequency, enabled } = request.body as z.infer<typeof scheduledScanSchema>;
      const orgId = request.user!.orgId;

      // Verify site belongs to org
      const site = await prisma.site.findFirst({
        where: { id: siteId, orgId },
      });

      if (!site) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Site not found',
            code: 'SITE_NOT_FOUND',
            statusCode: 404,
          },
        });
      }

      // Calculate next run time
      const now = new Date();
      let nextRun = new Date(now);

      switch (frequency) {
        case 'DAILY':
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case 'WEEKLY':
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        case 'MONTHLY':
          nextRun.setMonth(nextRun.getMonth() + 1);
          break;
      }

      const scheduledScan = await prisma.scheduledScan.create({
        data: {
          siteId,
          frequency,
          nextRun,
          enabled,
        },
        include: {
          site: {
            select: {
              id: true,
              name: true,
              url: true,
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId,
          userId: request.user!.id,
          action: 'SCHEDULED_SCAN_CREATED',
          details: { scheduledScanId: scheduledScan.id, siteId, frequency },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      return reply.status(201).send({
        success: true,
        data: scheduledScan,
      });
    }
  );

  /**
   * GET /organizations/me/competitors
   * List competitors
   */
  fastify.get(
    '/me/competitors',
    {
      preHandler: [fastify.authenticate, rateLimits.read],
      schema: {
        tags: ['organizations'],
        summary: 'List competitors',
        description: 'Get all competitors for the organization',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  competitors: {
                    type: 'array',
                    items: { type: 'object' },
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

      const competitors = await prisma.competitor.findMany({
        where: {
          site: { orgId },
        },
        include: {
          site: {
            select: {
              id: true,
              name: true,
              url: true,
            },
          },
        },
      });

      return reply.send({
        success: true,
        data: { competitors },
      });
    }
  );

  /**
   * POST /organizations/me/competitors
   * Add a competitor
   */
  fastify.post(
    '/me/competitors',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateBody(competitorSchema)],
      schema: {
        tags: ['organizations'],
        summary: 'Add competitor',
        description: 'Add a competitor for comparison',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['siteId', 'url'],
          properties: {
            siteId: { type: 'string' },
            url: { type: 'string', format: 'uri' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { siteId, url } = request.body as z.infer<typeof competitorSchema>;
      const orgId = request.user!.orgId;

      // Verify site belongs to org
      const site = await prisma.site.findFirst({
        where: { id: siteId, orgId },
      });

      if (!site) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Site not found',
            code: 'SITE_NOT_FOUND',
            statusCode: 404,
          },
        });
      }

      // Check if competitor already exists
      const existing = await prisma.competitor.findFirst({
        where: { siteId, url },
      });

      if (existing) {
        return reply.status(409).send({
          success: false,
          error: {
            message: 'Competitor already added',
            code: 'COMPETITOR_EXISTS',
            statusCode: 409,
          },
        });
      }

      const competitor = await prisma.competitor.create({
        data: {
          siteId,
          url,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId,
          userId: request.user!.id,
          action: 'COMPETITOR_ADDED',
          details: { competitorId: competitor.id, siteId, url },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      return reply.status(201).send({
        success: true,
        data: competitor,
      });
    }
  );

  /**
   * GET /organizations/me/audit-logs
   * Get audit logs
   */
  fastify.get(
    '/me/audit-logs',
    {
      preHandler: [fastify.authenticate, rateLimits.read],
      schema: {
        tags: ['organizations'],
        summary: 'Get audit logs',
        description: 'Get audit logs for the organization (requires ADMIN or OWNER role)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 50 },
            action: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // Check permissions
      if (!['OWNER', 'ADMIN'].includes(request.user!.role)) {
        return reply.status(403).send({
          success: false,
          error: {
            message: 'Only admins can view audit logs',
            code: 'FORBIDDEN',
            statusCode: 403,
          },
        });
      }

      const { page = 1, limit = 50, action } = request.query as { page?: number; limit?: number; action?: string };
      const orgId = request.user!.orgId;

      const where = {
        orgId,
        ...(action && { action }),
      };

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    }
  );
}
