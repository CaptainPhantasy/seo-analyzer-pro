/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { rateLimits } from '../middleware/rate-limit.js';
import { validateBody } from '../middleware/validate.js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

// Plan to Stripe price mapping
const PLAN_PRICES: Record<string, { priceId: string; name: string; features: string[] }> = {
  STARTER: {
    priceId: process.env.STRIPE_PRICE_STARTER || 'price_starter',
    name: 'Starter',
    features: ['3 sites', '50 scans/month', 'Basic reports', 'Email support'],
  },
  PROFESSIONAL: {
    priceId: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_professional',
    name: 'Professional',
    features: ['10 sites', '200 scans/month', 'Advanced reports', 'Competitor analysis', 'Priority support'],
  },
  ENTERPRISE: {
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
    name: 'Enterprise',
    features: ['Unlimited sites', 'Unlimited scans', 'Custom reports', 'API access', 'Dedicated support', 'SLA'],
  },
};

// Validation schemas
const checkoutSchema = z.object({
  plan: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const portalSchema = z.object({
  returnUrl: z.string().url(),
});

export default async function billingRoutes(fastify: FastifyInstance) {
  /**
   * GET /billing/plans
   * Get available plans
   */
  fastify.get(
    '/plans',
    {
      schema: {
        tags: ['billing'],
        summary: 'Get plans',
        description: 'Get available subscription plans',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  plans: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        features: { type: 'array', items: { type: 'string' } },
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
      const plans = Object.entries(PLAN_PRICES).map(([id, plan]) => ({
        id,
        name: plan.name,
        features: plan.features,
      }));

      return reply.send({
        success: true,
        data: { plans },
      });
    }
  );

  /**
   * GET /billing/subscription
   * Get current subscription
   */
  fastify.get(
    '/subscription',
    {
      preHandler: [fastify.authenticate, rateLimits.read],
      schema: {
        tags: ['billing'],
        summary: 'Get subscription',
        description: 'Get the current subscription details',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  plan: { type: 'string' },
                  status: { type: 'string' },
                  currentPeriodEnd: { type: 'string' },
                  cancelAtPeriodEnd: { type: 'boolean' },
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
        select: {
          plan: true,
          stripeCustomerId: true,
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

      // If no Stripe customer, return basic plan info
      if (!organization.stripeCustomerId) {
        return reply.send({
          success: true,
          data: {
            plan: organization.plan,
            status: 'active',
          },
        });
      }

      try {
        // Get subscription from Stripe
        const subscriptions = await stripe.subscriptions.list({
          customer: organization.stripeCustomerId,
          status: 'active',
          limit: 1,
        });

        const subscription = subscriptions.data[0];

        if (!subscription) {
          return reply.send({
            success: true,
            data: {
              plan: organization.plan,
              status: 'inactive',
            },
          });
        }

        return reply.send({
          success: true,
          data: {
            plan: organization.plan,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        });
      } catch (error) {
        logger.error({ error }, 'Failed to fetch subscription from Stripe');

        return reply.send({
          success: true,
          data: {
            plan: organization.plan,
            status: 'unknown',
          },
        });
      }
    }
  );

  /**
   * POST /billing/checkout
   * Create a checkout session
   */
  fastify.post(
    '/checkout',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateBody(checkoutSchema)],
      schema: {
        tags: ['billing'],
        summary: 'Create checkout',
        description: 'Create a Stripe checkout session for subscription',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['plan', 'successUrl', 'cancelUrl'],
          properties: {
            plan: { type: 'string', enum: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'] },
            successUrl: { type: 'string', format: 'uri' },
            cancelUrl: { type: 'string', format: 'uri' },
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
                  checkoutUrl: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { plan, successUrl, cancelUrl } = request.body as z.infer<typeof checkoutSchema>;
      const orgId = request.user!.orgId;
      const userId = request.user!.id;

      // Only owners can manage billing
      if (request.user!.role !== 'OWNER') {
        return reply.status(403).send({
          success: false,
          error: {
            message: 'Only owners can manage billing',
            code: 'FORBIDDEN',
            statusCode: 403,
          },
        });
      }

      const organization = await prisma.organization.findUnique({
        where: { id: orgId },
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

      let customerId = organization.stripeCustomerId;

      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        const customer = await stripe.customers.create({
          email: user?.email,
          name: organization.name,
          metadata: {
            orgId,
          },
        });

        customerId = customer.id;

        await prisma.organization.update({
          where: { id: orgId },
          data: { stripeCustomerId: customerId },
        });
      }

      const planConfig = PLAN_PRICES[plan];

      if (!planConfig) {
        return reply.status(400).send({
          success: false,
          error: {
            message: 'Invalid plan',
            code: 'INVALID_PLAN',
            statusCode: 400,
          },
        });
      }

      try {
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [
            {
              price: planConfig.priceId,
              quantity: 1,
            },
          ],
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            orgId,
            plan,
          },
        });

        // Create audit log
        await prisma.auditLog.create({
          data: {
            orgId,
            userId,
            action: 'CHECKOUT_SESSION_CREATED',
            details: { plan, sessionId: session.id },
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
          },
        });

        return reply.send({
          success: true,
          data: {
            checkoutUrl: session.url,
          },
        });
      } catch (error) {
        logger.error({ error }, 'Failed to create checkout session');

        return reply.status(500).send({
          success: false,
          error: {
            message: 'Failed to create checkout session',
            code: 'CHECKOUT_ERROR',
            statusCode: 500,
          },
        });
      }
    }
  );

  /**
   * POST /billing/portal
   * Create a customer portal session
   */
  fastify.post(
    '/portal',
    {
      preHandler: [fastify.authenticate, rateLimits.write, validateBody(portalSchema)],
      schema: {
        tags: ['billing'],
        summary: 'Create portal session',
        description: 'Create a Stripe customer portal session for managing subscription',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['returnUrl'],
          properties: {
            returnUrl: { type: 'string', format: 'uri' },
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
                  portalUrl: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { returnUrl } = request.body as z.infer<typeof portalSchema>;
      const orgId = request.user!.orgId;

      // Only owners can manage billing
      if (request.user!.role !== 'OWNER') {
        return reply.status(403).send({
          success: false,
          error: {
            message: 'Only owners can manage billing',
            code: 'FORBIDDEN',
            statusCode: 403,
          },
        });
      }

      const organization = await prisma.organization.findUnique({
        where: { id: orgId },
      });

      if (!organization?.stripeCustomerId) {
        return reply.status(400).send({
          success: false,
          error: {
            message: 'No subscription found',
            code: 'NO_SUBSCRIPTION',
            statusCode: 400,
          },
        });
      }

      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: organization.stripeCustomerId,
          return_url: returnUrl,
        });

        return reply.send({
          success: true,
          data: {
            portalUrl: session.url,
          },
        });
      } catch (error) {
        logger.error({ error }, 'Failed to create portal session');

        return reply.status(500).send({
          success: false,
          error: {
            message: 'Failed to create portal session',
            code: 'PORTAL_ERROR',
            statusCode: 500,
          },
        });
      }
    }
  );

  /**
   * POST /billing/cancel
   * Cancel subscription
   */
  fastify.post(
    '/cancel',
    {
      preHandler: [fastify.authenticate, rateLimits.write],
      schema: {
        tags: ['billing'],
        summary: 'Cancel subscription',
        description: 'Cancel the current subscription at period end',
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
      const orgId = request.user!.orgId;

      // Only owners can manage billing
      if (request.user!.role !== 'OWNER') {
        return reply.status(403).send({
          success: false,
          error: {
            message: 'Only owners can manage billing',
            code: 'FORBIDDEN',
            statusCode: 403,
          },
        });
      }

      const organization = await prisma.organization.findUnique({
        where: { id: orgId },
      });

      if (!organization?.stripeCustomerId) {
        return reply.status(400).send({
          success: false,
          error: {
            message: 'No subscription found',
            code: 'NO_SUBSCRIPTION',
            statusCode: 400,
          },
        });
      }

      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: organization.stripeCustomerId,
          status: 'active',
        });

        if (subscriptions.data.length === 0) {
          return reply.status(400).send({
            success: false,
            error: {
              message: 'No active subscription found',
              code: 'NO_ACTIVE_SUBSCRIPTION',
              statusCode: 400,
            },
          });
        }

        // Cancel at period end
        await stripe.subscriptions.update(subscriptions.data[0].id, {
          cancel_at_period_end: true,
        });

        // Create audit log
        await prisma.auditLog.create({
          data: {
            orgId,
            userId: request.user!.id,
            action: 'SUBSCRIPTION_CANCELLED',
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
          },
        });

        logger.info({ orgId }, 'Subscription cancelled');

        return reply.send({
          success: true,
          message: 'Subscription will be cancelled at the end of the billing period',
        });
      } catch (error) {
        logger.error({ error }, 'Failed to cancel subscription');

        return reply.status(500).send({
          success: false,
          error: {
            message: 'Failed to cancel subscription',
            code: 'CANCEL_ERROR',
            statusCode: 500,
          },
        });
      }
    }
  );
}
