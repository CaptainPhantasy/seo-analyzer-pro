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
import { validateParams, validateQuery } from '../middleware/validate.js';

// Validation schemas
const scanParamsSchema = z.object({
  id: z.string().cuid(),
});

const scanQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']).optional(),
  siteId: z.string().cuid().optional(),
});

const exportQuerySchema = z.object({
  format: z.enum(['pdf', 'json', 'csv']).default('json'),
});

export default async function scansRoutes(fastify: FastifyInstance) {
  /**
   * GET /scans
   * List all scans for the organization
   */
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate, rateLimits.read],
      schema: {
        tags: ['scans'],
        summary: 'List scans',
        description: 'Get all scans for the organization',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
            status: { type: 'string', enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'] },
            siteId: { type: 'string' },
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
                  scans: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        status: { type: 'string' },
                        scores: { type: 'object' },
                        metrics: { type: 'object' },
                        createdAt: { type: 'string' },
                        completedAt: { type: 'string' },
                        site: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            url: { type: 'string' },
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
      const { page, limit, status, siteId } = request.query as z.infer<typeof scanQuerySchema>;
      const orgId = request.user!.orgId;

      // Build where clause - only include sites from user's org
      const where: Record<string, unknown> = {
        site: { orgId },
      };

      if (status) {
        where.status = status;
      }

      if (siteId) {
        where.siteId = siteId;
      }

      const [scans, total] = await Promise.all([
        prisma.scan.findMany({
          where,
          select: {
            id: true,
            status: true,
            scores: true,
            metrics: true,
            createdAt: true,
            completedAt: true,
            site: {
              select: {
                id: true,
                name: true,
                url: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.scan.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: {
          scans,
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
   * GET /scans/:id
   * Get a specific scan by ID with full details
   */
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.authenticate, rateLimits.read, validateParams(scanParamsSchema)],
      schema: {
        tags: ['scans'],
        summary: 'Get scan',
        description: 'Get detailed scan results by ID',
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
                  status: { type: 'string' },
                  scores: { type: 'object' },
                  metrics: { type: 'object' },
                  actionItems: { type: 'object' },
                  errorMessage: { type: 'string' },
                  startedAt: { type: 'string' },
                  completedAt: { type: 'string' },
                  createdAt: { type: 'string' },
                  site: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      url: { type: 'string' },
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
      const { id } = request.params as z.infer<typeof scanParamsSchema>;
      const orgId = request.user!.orgId;

      const scan = await prisma.scan.findFirst({
        where: {
          id,
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

      if (!scan) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Scan not found',
            code: 'SCAN_NOT_FOUND',
            statusCode: 404,
          },
        });
      }

      return reply.send({
        success: true,
        data: scan,
      });
    }
  );

  /**
   * GET /scans/:id/export
   * Export scan results in various formats
   */
  fastify.get(
    '/:id/export',
    {
      preHandler: [fastify.authenticate, rateLimits.read, validateParams(scanParamsSchema)],
      schema: {
        tags: ['scans'],
        summary: 'Export scan',
        description: 'Export scan results as PDF, JSON, or CSV',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['pdf', 'json', 'csv'], default: 'json' },
          },
        },
        response: {
          200: {
            description: 'Exported scan data',
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as z.infer<typeof scanParamsSchema>;
      const { format } = request.query as z.infer<typeof exportQuerySchema>;
      const orgId = request.user!.orgId;

      const scan = await prisma.scan.findFirst({
        where: {
          id,
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

      if (!scan) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Scan not found',
            code: 'SCAN_NOT_FOUND',
            statusCode: 404,
          },
        });
      }

      if (scan.status !== 'COMPLETED') {
        return reply.status(400).send({
          success: false,
          error: {
            message: 'Scan is not completed yet',
            code: 'SCAN_NOT_COMPLETED',
            statusCode: 400,
          },
        });
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId,
          userId: request.user!.id,
          action: 'SCAN_EXPORTED',
          details: { scanId: id, format },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      switch (format) {
        case 'pdf':
          // For PDF, we would typically use a library like puppeteer or pdfkit
          // For now, return JSON with PDF content type hint
          reply.header('Content-Type', 'application/pdf');
          reply.header('Content-Disposition', `attachment; filename="scan-${id}.pdf"`);
          // In production, generate actual PDF here
          return reply.send({
            message: 'PDF generation would be implemented with puppeteer/pdfkit',
            data: scan,
          });

        case 'csv':
          // Convert scan data to CSV format
          reply.header('Content-Type', 'text/csv');
          reply.header('Content-Disposition', `attachment; filename="scan-${id}.csv"`);

          const scores = scan.scores as Record<string, number> | null;
          const csvRows = [
            'Category,Score',
            ...(scores
              ? Object.entries(scores).map(([key, value]) => `${key},${value}`)
              : []),
          ];

          return reply.send(csvRows.join('\n'));

        case 'json':
        default:
          reply.header('Content-Type', 'application/json');
          reply.header('Content-Disposition', `attachment; filename="scan-${id}.json"`);
          return reply.send({
            success: true,
            data: scan,
            exportedAt: new Date().toISOString(),
          });
      }
    }
  );

  /**
   * GET /scans/:id/llm-prompt
   * Get scan results formatted for LLM consumption
   */
  fastify.get(
    '/:id/llm-prompt',
    {
      preHandler: [fastify.authenticate, rateLimits.read, validateParams(scanParamsSchema)],
      schema: {
        tags: ['scans'],
        summary: 'Get LLM prompt',
        description: 'Get scan results formatted as an LLM-optimized prompt for AI analysis',
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
                  prompt: { type: 'string' },
                  context: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as z.infer<typeof scanParamsSchema>;
      const orgId = request.user!.orgId;

      const scan = await prisma.scan.findFirst({
        where: {
          id,
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

      if (!scan) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Scan not found',
            code: 'SCAN_NOT_FOUND',
            statusCode: 404,
          },
        });
      }

      if (scan.status !== 'COMPLETED') {
        return reply.status(400).send({
          success: false,
          error: {
            message: 'Scan is not completed yet',
            code: 'SCAN_NOT_COMPLETED',
            statusCode: 400,
          },
        });
      }

      const scores = scan.scores as Record<string, unknown> | null;
      const metrics = scan.metrics as Record<string, unknown> | null;
      const actionItems = scan.actionItems as Array<Record<string, unknown>> | null;

      // Generate LLM-optimized prompt
      const prompt = `# SEO Analysis Report for ${scan.site.name}

## Website URL
${scan.site.url}

## Scan Date
${scan.createdAt.toISOString()}

## Overall Scores
${scores ? JSON.stringify(scores, null, 2) : 'No scores available'}

## Detailed Metrics
${metrics ? JSON.stringify(metrics, null, 2) : 'No metrics available'}

## Recommended Action Items
${actionItems ? actionItems.map((item, i) => `${i + 1}. ${JSON.stringify(item)}`).join('\n') : 'No action items available'}

## Task
Based on the above SEO analysis data, please provide:
1. A summary of the website's current SEO health
2. Priority-ranked recommendations for improvement
3. Specific, actionable steps for each recommendation
4. Expected impact of implementing each recommendation

Format your response in a clear, structured manner suitable for a business stakeholder.`;

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId,
          userId: request.user!.id,
          action: 'LLM_PROMPT_GENERATED',
          details: { scanId: id },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      return reply.send({
        success: true,
        data: {
          prompt,
          context: {
            siteId: scan.site.id,
            siteName: scan.site.name,
            siteUrl: scan.site.url,
            scanId: scan.id,
            scanDate: scan.createdAt,
            scores,
            metrics,
            actionItems,
          },
        },
      });
    }
  );

  /**
   * DELETE /scans/:id
   * Delete a scan
   */
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateParams(scanParamsSchema)],
      schema: {
        tags: ['scans'],
        summary: 'Delete scan',
        description: 'Delete a scan and its results',
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
      const { id } = request.params as z.infer<typeof scanParamsSchema>;
      const orgId = request.user!.orgId;

      // Verify scan belongs to user's org
      const scan = await prisma.scan.findFirst({
        where: {
          id,
          site: { orgId },
        },
      });

      if (!scan) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Scan not found',
            code: 'SCAN_NOT_FOUND',
            statusCode: 404,
          },
        });
      }

      await prisma.scan.delete({
        where: { id },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId,
          userId: request.user!.id,
          action: 'SCAN_DELETED',
          details: { scanId: id },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      logger.info({ scanId: id, orgId }, 'Scan deleted');

      return reply.send({
        success: true,
        message: 'Scan deleted successfully',
      });
    }
  );
}
