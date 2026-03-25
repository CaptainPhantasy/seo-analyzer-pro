/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { scanQueue } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import { rateLimits } from '../middleware/rate-limit.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';

// Validation schemas
const createSiteSchema = z.object({
  url: z.string().url('Invalid URL format'),
  name: z.string().min(1, 'Site name is required').max(100),
  settings: z
    .object({
      crawlDepth: z.number().int().min(1).max(10).optional(),
      excludePaths: z.array(z.string()).optional(),
      includePaths: z.array(z.string()).optional(),
      userAgent: z.string().optional(),
      timeout: z.number().int().min(5000).max(60000).optional(),
    })
    .optional(),
});

const updateSiteSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  settings: z
    .object({
      crawlDepth: z.number().int().min(1).max(10).optional(),
      excludePaths: z.array(z.string()).optional(),
      includePaths: z.array(z.string()).optional(),
      userAgent: z.string().optional(),
      timeout: z.number().int().min(5000).max(60000).optional(),
    })
    .optional(),
});

const siteParamsSchema = z.object({
  id: z.string().cuid(),
});

const siteQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export default async function sitesRoutes(fastify: FastifyInstance) {
  /**
   * GET /sites
   * List all sites for the current organization
   */
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate, rateLimits.read],
      schema: {
        tags: ['sites'],
        summary: 'List sites',
        description: 'Get all sites for the current organization',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
            search: { type: 'string' },
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
                  sites: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        url: { type: 'string' },
                        name: { type: 'string' },
                        settings: { type: 'object' },
                        createdAt: { type: 'string' },
                        _count: {
                          type: 'object',
                          properties: {
                            scans: { type: 'number' },
                          },
                        },
                      },
                    },
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'number' },
                      limit: { type: 'number' },
                      total: { type: 'number' },
                      totalPages: { type: 'number' },
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
      const { page, limit, search } = request.query as z.infer<typeof siteQuerySchema>;
      const orgId = request.user!.orgId;

      const where = {
        orgId,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { url: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [sites, total] = await Promise.all([
        prisma.site.findMany({
          where,
          select: {
            id: true,
            url: true,
            name: true,
            settings: true,
            createdAt: true,
            _count: {
              select: { scans: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.site.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: {
          sites,
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

  /**
   * POST /sites
   * Create a new site
   */
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateBody(createSiteSchema)],
      schema: {
        tags: ['sites'],
        summary: 'Create site',
        description: 'Add a new site to analyze',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['url', 'name'],
          properties: {
            url: { type: 'string', format: 'uri' },
            name: { type: 'string', minLength: 1, maxLength: 100 },
            settings: { type: 'object' },
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
                  url: { type: 'string' },
                  name: { type: 'string' },
                  settings: { type: 'object' },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { url, name, settings } = request.body as z.infer<typeof createSiteSchema>;
      const orgId = request.user!.orgId;

      // Check if site already exists for this org
      const existingSite = await prisma.site.findFirst({
        where: { orgId, url },
      });

      if (existingSite) {
        return reply.status(409).send({
          success: false,
          error: {
            message: 'This site has already been added to your organization',
            code: 'SITE_EXISTS',
            statusCode: 409,
          },
        });
      }

      // Check plan limits
      const organization = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
          _count: { select: { sites: true } },
        },
      });

      const siteLimit = (organization?.settings as Record<string, unknown>)?.limits as Record<string, number> | undefined;
      if (siteLimit?.sites && organization!._count.sites >= siteLimit.sites) {
        return reply.status(403).send({
          success: false,
          error: {
            message: `Site limit reached. Your plan allows ${siteLimit.sites} sites.`,
            code: 'PLAN_LIMIT_REACHED',
            statusCode: 403,
          },
        });
      }

      const site = await prisma.site.create({
        data: {
          orgId,
          url,
          name,
          settings: settings ?? {},
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId,
          userId: request.user!.id,
          action: 'SITE_CREATED',
          details: { siteId: site.id, url, name },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      logger.info({ siteId: site.id, orgId }, 'Site created');

      return reply.status(201).send({
        success: true,
        data: site,
      });
    }
  );

  /**
   * GET /sites/:id
   * Get a specific site by ID
   */
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.authenticate, rateLimits.read, validateParams(siteParamsSchema)],
      schema: {
        tags: ['sites'],
        summary: 'Get site',
        description: 'Get a specific site by ID',
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
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  url: { type: 'string' },
                  name: { type: 'string' },
                  settings: { type: 'object' },
                  createdAt: { type: 'string' },
                  scans: {
                    type: 'array',
                    items: { type: 'object' },
                  },
                  scheduledScans: {
                    type: 'array',
                    items: { type: 'object' },
                  },
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
      const { id } = request.params as z.infer<typeof siteParamsSchema>;
      const orgId = request.user!.orgId;

      const site = await prisma.site.findFirst({
        where: { id, orgId },
        include: {
          scans: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              status: true,
              scores: true,
              createdAt: true,
              completedAt: true,
            },
          },
          scheduledScans: {
            where: { enabled: true },
          },
          competitors: true,
        },
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

      return reply.send({
        success: true,
        data: site,
      });
    }
  );

  /**
   * PUT /sites/:id
   * Update a site
   */
  fastify.put(
    '/:id',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateParams(siteParamsSchema), validateBody(updateSiteSchema)],
      schema: {
        tags: ['sites'],
        summary: 'Update site',
        description: 'Update site settings',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
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
                  url: { type: 'string' },
                  name: { type: 'string' },
                  settings: { type: 'object' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as z.infer<typeof siteParamsSchema>;
      const updateData = request.body as z.infer<typeof updateSiteSchema>;
      const orgId = request.user!.orgId;

      // Verify site belongs to user's org
      const existingSite = await prisma.site.findFirst({
        where: { id, orgId },
      });

      if (!existingSite) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Site not found',
            code: 'SITE_NOT_FOUND',
            statusCode: 404,
          },
        });
      }

      const site = await prisma.site.update({
        where: { id },
        data: updateData,
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId,
          userId: request.user!.id,
          action: 'SITE_UPDATED',
          details: { siteId: id, changes: updateData },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      return reply.send({
        success: true,
        data: site,
      });
    }
  );

  /**
   * DELETE /sites/:id
   * Delete a site
   */
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateParams(siteParamsSchema)],
      schema: {
        tags: ['sites'],
        summary: 'Delete site',
        description: 'Delete a site and all associated data',
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
      const { id } = request.params as z.infer<typeof siteParamsSchema>;
      const orgId = request.user!.orgId;

      // Verify site belongs to user's org
      const site = await prisma.site.findFirst({
        where: { id, orgId },
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

      // Delete site (cascades to scans, scheduled scans, competitors)
      await prisma.site.delete({
        where: { id },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId,
          userId: request.user!.id,
          action: 'SITE_DELETED',
          details: { siteId: id, url: site.url },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      logger.info({ siteId: id, orgId }, 'Site deleted');

      return reply.send({
        success: true,
        message: 'Site deleted successfully',
      });
    }
  );

  /**
   * POST /sites/:id/scans
   * Trigger a new scan for a site
   */
  fastify.post(
    '/:id/scans',
    {
      preHandler: [fastify.authenticate, rateLimits.scan, validateParams(siteParamsSchema)],
      schema: {
        tags: ['sites'],
        summary: 'Trigger scan',
        description: 'Start a new SEO scan for the site',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          202: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  scanId: { type: 'string' },
                  status: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id: siteId } = request.params as z.infer<typeof siteParamsSchema>;
      const orgId = request.user!.orgId;

      // Verify site belongs to user's org
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

      // Create scan record
      const scan = await prisma.scan.create({
        data: {
          siteId,
          status: 'PENDING',
        },
      });

      // Add scan job to queue
      await scanQueue.add('scan', {
        scanId: scan.id,
        siteId,
        url: site.url,
        userId: request.user!.id,
        orgId,
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId,
          userId: request.user!.id,
          action: 'SCAN_TRIGGERED',
          details: { scanId: scan.id, siteId, url: site.url },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      logger.info({ scanId: scan.id, siteId, orgId }, 'Scan triggered');

      return reply.status(202).send({
        success: true,
        data: {
          scanId: scan.id,
          status: scan.status,
          message: 'Scan queued successfully',
        },
      });
    }
  );
}
