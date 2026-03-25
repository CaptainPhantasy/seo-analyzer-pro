/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import Stripe from 'stripe';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

// Plan configuration
export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    features: {
      sites: 1,
      scansPerMonth: 10,
      competitors: 0,
      scheduledScans: false,
      apiAccess: false,
      teamMembers: 1,
    },
  },
  STARTER: {
    name: 'Starter',
    price: 29,
    priceId: process.env.STRIPE_PRICE_STARTER || 'price_starter',
    features: {
      sites: 3,
      scansPerMonth: 50,
      competitors: 3,
      scheduledScans: true,
      apiAccess: false,
      teamMembers: 2,
    },
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 99,
    priceId: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_professional',
    features: {
      sites: 10,
      scansPerMonth: 200,
      competitors: 10,
      scheduledScans: true,
      apiAccess: true,
      teamMembers: 5,
    },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 299,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
    features: {
      sites: -1, // Unlimited
      scansPerMonth: -1, // Unlimited
      competitors: -1, // Unlimited
      scheduledScans: true,
      apiAccess: true,
      teamMembers: -1, // Unlimited
    },
  },
} as const;

export type PlanType = keyof typeof PLANS;

/**
 * Stripe Service - Handles Stripe operations
 */
export class StripeService {
  /**
   * Create a Stripe customer
   */
  async createCustomer(email: string, name: string, orgId: string): Promise<Stripe.Customer> {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        orgId,
      },
    });

    logger.info({ customerId: customer.id, orgId }, 'Stripe customer created');

    return customer;
  }

  /**
   * Get a Stripe customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    try {
      return await stripe.customers.retrieve(customerId) as Stripe.Customer;
    } catch (error) {
      logger.error({ error, customerId }, 'Failed to retrieve Stripe customer');
      return null;
    }
  }

  /**
   * Update a Stripe customer
   */
  async updateCustomer(customerId: string, data: Stripe.CustomerUpdateParams): Promise<Stripe.Customer> {
    return stripe.customers.update(customerId, data);
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    metadata: Record<string, string>
  ): Promise<Stripe.Checkout.Session> {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      subscription_data: {
        metadata,
      },
    });

    logger.info({ sessionId: session.id, customerId }, 'Checkout session created');

    return session;
  }

  /**
   * Create a billing portal session
   */
  async createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    return stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  /**
   * Get subscription by customer ID
   */
  async getSubscription(customerId: string): Promise<Stripe.Subscription | null> {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    return subscriptions.data[0] || null;
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscriptionAtPeriodEnd(subscriptionId: string): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    logger.info({ subscriptionId }, 'Subscription marked for cancellation');

    return subscription;
  }

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    logger.info({ subscriptionId }, 'Subscription reactivated');

    return subscription;
  }

  /**
   * Immediately cancel a subscription
   */
  async cancelSubscriptionImmediately(subscriptionId: string): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);

    logger.info({ subscriptionId }, 'Subscription cancelled immediately');

    return subscription;
  }

  /**
   * Update subscription plan
   */
  async updateSubscriptionPlan(
    subscriptionId: string,
    newPriceId: string
  ): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'always_invoice',
    });

    logger.info({ subscriptionId, newPriceId }, 'Subscription plan updated');

    return updatedSubscription;
  }

  /**
   * Get upcoming invoice
   */
  async getUpcomingInvoice(customerId: string): Promise<Stripe.Invoice | null> {
    try {
      return await stripe.invoices.retrieveUpcoming({
        customer: customerId,
      });
    } catch (error) {
      logger.error({ error, customerId }, 'Failed to retrieve upcoming invoice');
      return null;
    }
  }

  /**
   * Get invoices for a customer
   */
  async getInvoices(customerId: string, limit = 10): Promise<Stripe.Invoice[]> {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data;
  }

  /**
   * Get payment methods for a customer
   */
  async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data;
  }

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<Stripe.PaymentMethod> {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    logger.info({ customerId, paymentMethodId }, 'Payment method attached');

    return paymentMethod;
  }

  /**
   * Detach a payment method
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    return stripe.paymentMethods.detach(paymentMethodId);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  }

  /**
   * Check if organization can use a feature based on their plan
   */
  async checkFeatureAccess(orgId: string, feature: keyof typeof PLANS.FREE.features): Promise<boolean> {
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });

    if (!organization) return false;

    const plan = PLANS[organization.plan as PlanType] || PLANS.FREE;
    const featureValue = plan.features[feature];

    // -1 means unlimited
    if (featureValue === -1) return true;

    // Boolean features
    if (typeof featureValue === 'boolean') return featureValue;

    // Numeric features - need to check current usage
    if (typeof featureValue === 'number') {
      const usage = await this.getCurrentUsage(orgId, feature);
      return usage < featureValue;
    }

    return false;
  }

  /**
   * Get current usage for a feature
   */
  async getCurrentUsage(orgId: string, feature: string): Promise<number> {
    switch (feature) {
      case 'sites': {
        const count = await prisma.site.count({ where: { orgId } });
        return count;
      }
      case 'teamMembers': {
        const count = await prisma.user.count({ where: { orgId } });
        return count;
      }
      case 'scansPerMonth': {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const count = await prisma.scan.count({
          where: {
            site: { orgId },
            createdAt: { gte: startOfMonth },
          },
        });
        return count;
      }
      case 'competitors': {
        const count = await prisma.competitor.count({
          where: { site: { orgId } },
        });
        return count;
      }
      default:
        return 0;
    }
  }

  /**
   * Get plan limits for an organization
   */
  async getPlanLimits(orgId: string): Promise<{
    plan: string;
    limits: Record<string, number | boolean>;
    usage: Record<string, number>;
  }> {
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const plan = PLANS[organization.plan as PlanType] || PLANS.FREE;

    const usage = {
      sites: await this.getCurrentUsage(orgId, 'sites'),
      teamMembers: await this.getCurrentUsage(orgId, 'teamMembers'),
      scansPerMonth: await this.getCurrentUsage(orgId, 'scansPerMonth'),
      competitors: await this.getCurrentUsage(orgId, 'competitors'),
    };

    return {
      plan: organization.plan,
      limits: plan.features,
      usage,
    };
  }
}

export const stripeService = new StripeService();
