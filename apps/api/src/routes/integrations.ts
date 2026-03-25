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
import { validateBody, validateParams } from '../middleware/validate.js';

// Validation schemas
const integrationParamsSchema = z.object({
  id: z.string().cuid(),
});

const createIntegrationSchema = z.object({
  type: z.enum(['GOOGLE_SEARCH_CONSOLE', 'GOOGLE_ANALYTICS', 'SLACK', 'WEBHOOK', 'ZAPIER']),
  config: z.record(z.unknown()).optional(),
});

const updateIntegrationSchema = z.object({
  config: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

export default async function integrationsRoutes(fastify: FastifyInstance) {
  /**
   * GET /integrations
   * List all integrations for the organization
   */
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate, rateLimits.read],
      schema: {
        tags: ['integrations'],
        summary: 'List integrations',
        description: 'Get all integrations for the organization',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  integrations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        type: { type: 'string' },
                        config: { type: 'object' },
                        enabled: { type: 'boolean' },
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

      const integrations = await prisma.integration.findMany({
        where: { orgId },
        select: {
          id: true,
          type: true,
          config: true,
          enabled: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Mask sensitive config data
      const maskedIntegrations = integrations.map((integration) => {
        const config = integration.config as Record<string, unknown> | null;
        const maskedConfig = config ? maskSensitiveConfig(config, integration.type) : null;

        return {
          ...integration,
          config: maskedConfig,
        };
      });

      return reply.send({
        success: true,
        data: { integrations: maskedIntegrations },
      });
    }
  );

  /**
   * GET /integrations/:id
   * Get a specific integration
   */
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.authenticate, rateLimits.read, validateParams(integrationParamsSchema)],
      schema: {
        tags: ['integrations'],
        summary: 'Get integration',
        description: 'Get a specific integration by ID',
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
                  type: { type: 'string' },
                  config: { type: 'object' },
                  enabled: { type: 'boolean' },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as z.infer<typeof integrationParamsSchema>;
      const orgId = request.user!.orgId;

      const integration = await prisma.integration.findFirst({
        where: { id, orgId },
      });

      if (!integration) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Integration not found',
            code: 'INTEGRATION_NOT_FOUND',
            statusCode: 404,
          },
        });
      }

      // Mask sensitive config data
      const config = integration.config as Record<string, unknown> | null;
      const maskedConfig = config ? maskSensitiveConfig(config, integration.type) : null;

      return reply.send({
        success: true,
        data: {
          ...integration,
          config: maskedConfig,
        },
      });
    }
  );

  /**
   * POST /integrations
   * Create a new integration
   */
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateBody(createIntegrationSchema)],
      schema: {
        tags: ['integrations'],
        summary: 'Create integration',
        description: 'Create a new integration (requires ADMIN or OWNER role)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['type'],
          properties: {
            type: {
              type: 'string',
              enum: ['GOOGLE_SEARCH_CONSOLE', 'GOOGLE_ANALYTICS', 'SLACK', 'WEBHOOK', 'ZAPIER'],
            },
            config: { type: 'object' },
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
                  type: { type: 'string' },
                  enabled: { type: 'boolean' },
                  createdAt: { type: 'string' },
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
            message: 'Only admins can create integrations',
            code: 'FORBIDDEN',
            statusCode: 403,
          },
        });
      }

      const { type, config } = request.body as z.infer<typeof createIntegrationSchema>;
      const orgId = request.user!.orgId;

      // Check if integration type already exists
      const existing = await prisma.integration.findUnique({
        where: {
          orgId_type: { orgId, type },
        },
      });

      if (existing) {
        return reply.status(409).send({
          success: false,
          error: {
            message: 'This integration type already exists',
            code: 'INTEGRATION_EXISTS',
            statusCode: 409,
          },
        });
      }

      // Validate config based on type
      const validationError = validateIntegrationConfig(type, config);
      if (validationError) {
        return reply.status(400).send({
          success: false,
          error: {
            message: validationError,
            code: 'INVALID_CONFIG',
            statusCode: 400,
          },
        });
      }

      const integration = await prisma.integration.create({
        data: {
          orgId,
          type,
          config: config ?? {},
          enabled: true,
        },
        select: {
          id: true,
          type: true,
          enabled: true,
          createdAt: true,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId,
          userId: request.user!.id,
          action: 'INTEGRATION_CREATED',
          details: { integrationId: integration.id, type },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      logger.info({ integrationId: integration.id, orgId, type }, 'Integration created');

      return reply.status(201).send({
        success: true,
        data: integration,
      });
    }
  );

  /**
   * PATCH /integrations/:id
   * Update an integration
   */
  fastify.patch(
    '/:id',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateParams(integrationParamsSchema), validateBody(updateIntegrationSchema)],
      schema: {
        tags: ['integrations'],
        summary: 'Update integration',
        description: 'Update an integration configuration',
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
            config: { type: 'object' },
            enabled: { type: 'boolean' },
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
                  type: { type: 'string' },
                  enabled: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as z.infer<typeof integrationParamsSchema>;
      const updateData = request.body as z.infer<typeof updateIntegrationSchema>;
      const orgId = request.user!.orgId;

      // Verify integration exists and belongs to org
      const existing = await prisma.integration.findFirst({
        where: { id, orgId },
      });

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Integration not found',
            code: 'INTEGRATION_NOT_FOUND',
            statusCode: 404,
          },
        });
      }

      // Validate config if provided
      if (updateData.config) {
        const validationError = validateIntegrationConfig(existing.type, updateData.config);
        if (validationError) {
          return reply.status(400).send({
            success: false,
            error: {
              message: validationError,
              code: 'INVALID_CONFIG',
              statusCode: 400,
            },
          });
        }
      }

      const integration = await prisma.integration.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          type: true,
          enabled: true,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId,
          userId: request.user!.id,
          action: 'INTEGRATION_UPDATED',
          details: { integrationId: id, changes: updateData },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      return reply.send({
        success: true,
        data: integration,
      });
    }
  );

  /**
   * DELETE /integrations/:id
   * Delete an integration
   */
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateParams(integrationParamsSchema)],
      schema: {
        tags: ['integrations'],
        summary: 'Delete integration',
        description: 'Delete an integration',
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
      const { id } = request.params as z.infer<typeof integrationParamsSchema>;
      const orgId = request.user!.orgId;

      // Verify integration exists and belongs to org
      const integration = await prisma.integration.findFirst({
        where: { id, orgId },
      });

      if (!integration) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Integration not found',
            code: 'INTEGRATION_NOT_FOUND',
            statusCode: 404,
          },
        });
      }

      await prisma.integration.delete({
        where: { id },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId,
          userId: request.user!.id,
          action: 'INTEGRATION_DELETED',
          details: { integrationId: id, type: integration.type },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      logger.info({ integrationId: id, orgId }, 'Integration deleted');

      return reply.send({
        success: true,
        message: 'Integration deleted successfully',
      });
    }
  );

  /**
   * POST /integrations/:id/test
   * Test an integration connection
   */
  fastify.post(
    '/:id/test',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateParams(integrationParamsSchema)],
      schema: {
        tags: ['integrations'],
        summary: 'Test integration',
        description: 'Test an integration connection',
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
                  connected: { type: 'boolean' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as z.infer<typeof integrationParamsSchema>;
      const orgId = request.user!.orgId;

      const integration = await prisma.integration.findFirst({
        where: { id, orgId },
      });

      if (!integration) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Integration not found',
            code: 'INTEGRATION_NOT_FOUND',
            statusCode: 404,
          },
        });
      }

      // Test the integration based on type
      const result = await testIntegration(integration.type, integration.config as Record<string, unknown>);

      return reply.send({
        success: true,
        data: result,
      });
    }
  );
}

// Helper functions

function maskSensitiveConfig(config: Record<string, unknown>, type: string): Record<string, unknown> {
  const masked = { ...config };

  const sensitiveFields: Record<string, string[]> = {
    GOOGLE_SEARCH_CONSOLE: ['privateKey', 'clientSecret'],
    GOOGLE_ANALYTICS: ['privateKey', 'clientSecret'],
    SLACK: ['botToken', 'webhookUrl'],
    WEBHOOK: ['secret'],
    ZAPIER: ['apiKey'],
  };

  const fieldsToMask = sensitiveFields[type] || [];

  for (const field of fieldsToMask) {
    if (masked[field]) {
      const value = String(masked[field]);
      if (value.length > 8) {
        masked[field] = value.substring(0, 4) + '****' + value.substring(value.length - 4);
      } else {
        masked[field] = '****';
      }
    }
  }

  return masked;
}

function validateIntegrationConfig(type: string, config: Record<string, unknown> | undefined): string | null {
  if (!config) return null;

  switch (type) {
    case 'GOOGLE_SEARCH_CONSOLE':
      if (!config.clientEmail || !config.privateKey) {
        return 'Google Search Console requires clientEmail and privateKey';
      }
      break;

    case 'GOOGLE_ANALYTICS':
      if (!config.propertyId || !config.clientEmail || !config.privateKey) {
        return 'Google Analytics requires propertyId, clientEmail, and privateKey';
      }
      break;

    case 'SLACK':
      if (!config.webhookUrl && !config.botToken) {
        return 'Slack requires either webhookUrl or botToken';
      }
      if (config.webhookUrl && !isValidUrl(config.webhookUrl as string)) {
        return 'Invalid Slack webhook URL';
      }
      break;

    case 'WEBHOOK':
      if (!config.url) {
        return 'Webhook requires url';
      }
      if (!isValidUrl(config.url as string)) {
        return 'Invalid webhook URL';
      }
      break;

    case 'ZAPIER':
      if (!config.webhookUrl) {
        return 'Zapier requires webhookUrl';
      }
      if (!isValidUrl(config.webhookUrl as string)) {
        return 'Invalid Zapier webhook URL';
      }
      break;
  }

  return null;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function testIntegration(
  type: string,
  config: Record<string, unknown>
): Promise<{ connected: boolean; message: string }> {
  switch (type) {
    case 'SLACK':
    case 'WEBHOOK':
    case 'ZAPIER': {
      const url = (config.webhookUrl || config.url) as string;
      if (!url) {
        return { connected: false, message: 'No webhook URL configured' };
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
        });

        if (response.ok) {
          return { connected: true, message: 'Webhook test successful' };
        } else {
          return { connected: false, message: `Webhook returned status ${response.status}` };
        }
      } catch (error) {
        const err = error as Error;
        return { connected: false, message: `Webhook test failed: ${err.message}` };
      }
    }

    case 'GOOGLE_SEARCH_CONSOLE':
    case 'GOOGLE_ANALYTICS':
      // For Google integrations, we would verify the credentials
      // For now, just check if required fields are present
      if (config.clientEmail && config.privateKey) {
        return { connected: true, message: 'Credentials configured (verification pending)' };
      }
      return { connected: false, message: 'Missing required credentials' };

    default:
      return { connected: false, message: 'Unknown integration type' };
  }
}
