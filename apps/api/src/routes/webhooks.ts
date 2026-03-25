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
import { webhookQueue } from '../lib/queue.js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

// Webhook secret for signature verification
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export default async function webhooksRoutes(fastify: FastifyInstance) {
  /**
   * POST /webhooks/stripe
   * Handle Stripe webhooks
   */
  fastify.post(
    '/stripe',
    {
      config: {
        rawBody: true,
      },
      schema: {
        tags: ['webhooks'],
        summary: 'Stripe webhook',
        description: 'Handle Stripe webhook events',
        hide: true,
      },
    },
    async (request, reply) => {
      const sig = request.headers['stripe-signature'] as string;
      const rawBody = request.body as string;

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } catch (err) {
        const error = err as Error;
        logger.error({ error: error.message }, 'Stripe webhook signature verification failed');
        return reply.status(400).send({
          success: false,
          error: {
            message: 'Webhook signature verification failed',
            code: 'INVALID_SIGNATURE',
          },
        });
      }

      logger.info({ eventType: event.type, eventId: event.id }, 'Stripe webhook received');

      try {
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            await handleCheckoutCompleted(session);
            break;
          }

          case 'customer.subscription.created':
          case 'customer.subscription.updated': {
            const subscription = event.data.object as Stripe.Subscription;
            await handleSubscriptionUpdated(subscription);
            break;
          }

          case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;
            await handleSubscriptionDeleted(subscription);
            break;
          }

          case 'invoice.payment_succeeded': {
            const invoice = event.data.object as Stripe.Invoice;
            await handlePaymentSucceeded(invoice);
            break;
          }

          case 'invoice.payment_failed': {
            const invoice = event.data.object as Stripe.Invoice;
            await handlePaymentFailed(invoice);
            break;
          }

          default:
            logger.info({ eventType: event.type }, 'Unhandled Stripe event');
        }

        return reply.send({ received: true });
      } catch (error) {
        logger.error({ error, eventType: event.type }, 'Error processing Stripe webhook');
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Error processing webhook',
            code: 'WEBHOOK_ERROR',
          },
        });
      }
    }
  );

  /**
   * POST /webhooks/test
   * Test webhook endpoint
   */
  fastify.post(
    '/test',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['webhooks'],
        summary: 'Test webhook',
        description: 'Send a test webhook to configured integrations',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            event: { type: 'string' },
            payload: { type: 'object' },
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
      const { event, payload } = request.body as { event: string; payload: Record<string, unknown> };
      const orgId = request.user!.orgId;

      // Queue webhook for delivery
      await webhookQueue.add('deliver', {
        orgId,
        event,
        payload: payload ?? { test: true, timestamp: new Date().toISOString() },
      });

      return reply.send({
        success: true,
        message: 'Test webhook queued for delivery',
      });
    }
  );
}

// Stripe webhook handlers

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const orgId = session.metadata?.orgId;
  const plan = session.metadata?.plan;

  if (!orgId || !plan) {
    logger.warn({ sessionId: session.id }, 'Checkout session missing metadata');
    return;
  }

  // Update organization plan
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      plan: plan as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE',
      stripeCustomerId: session.customer as string,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      orgId,
      action: 'SUBSCRIPTION_CREATED',
      details: { plan, sessionId: session.id },
    },
  });

  logger.info({ orgId, plan }, 'Subscription created via checkout');
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;

  const organization = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!organization) {
    logger.warn({ customerId }, 'Organization not found for Stripe customer');
    return;
  }

  // Get plan from subscription metadata or price
  const priceId = subscription.items.data[0]?.price.id;
  let plan = 'FREE';

  // Map price ID to plan
  if (priceId === process.env.STRIPE_PRICE_STARTER) plan = 'STARTER';
  else if (priceId === process.env.STRIPE_PRICE_PROFESSIONAL) plan = 'PROFESSIONAL';
  else if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) plan = 'ENTERPRISE';

  await prisma.organization.update({
    where: { id: organization.id },
    data: { plan: plan as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      orgId: organization.id,
      action: 'SUBSCRIPTION_UPDATED',
      details: { plan, status: subscription.status },
    },
  });

  logger.info({ orgId: organization.id, plan, status: subscription.status }, 'Subscription updated');
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;

  const organization = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!organization) {
    logger.warn({ customerId }, 'Organization not found for Stripe customer');
    return;
  }

  // Downgrade to free plan
  await prisma.organization.update({
    where: { id: organization.id },
    data: { plan: 'FREE' },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      orgId: organization.id,
      action: 'SUBSCRIPTION_CANCELLED',
      details: { subscriptionId: subscription.id },
    },
  });

  logger.info({ orgId: organization.id }, 'Subscription cancelled, downgraded to free');
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  const organization = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!organization) {
    return;
  }

  // Create audit log
  await prisma.auditLog.create({
    data: {
      orgId: organization.id,
      action: 'PAYMENT_SUCCEEDED',
      details: {
        invoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
      },
    },
  });

  logger.info({ orgId: organization.id, invoiceId: invoice.id }, 'Payment succeeded');

  // Queue webhook notification
  await webhookQueue.add('deliver', {
    orgId: organization.id,
    event: 'payment.succeeded',
    payload: {
      invoiceId: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
    },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  const organization = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!organization) {
    return;
  }

  // Create audit log
  await prisma.auditLog.create({
    data: {
      orgId: organization.id,
      action: 'PAYMENT_FAILED',
      details: {
        invoiceId: invoice.id,
        amount: invoice.amount_due,
        attemptCount: invoice.attempt_count,
      },
    },
  });

  logger.warn({ orgId: organization.id, invoiceId: invoice.id }, 'Payment failed');

  // Queue webhook notification
  await webhookQueue.add('deliver', {
    orgId: organization.id,
    event: 'payment.failed',
    payload: {
      invoiceId: invoice.id,
      amount: invoice.amount_due,
      attemptCount: invoice.attempt_count,
    },
  });
}
