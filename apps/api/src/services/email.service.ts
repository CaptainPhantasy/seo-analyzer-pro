/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import { logger } from '../lib/logger.js';
import { emailQueue, EmailJobData } from '../lib/queue.js';

// Email templates
interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Email Service - Handles email operations
 */
export class EmailService {
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@seoanalyzer.pro';
    this.fromName = process.env.EMAIL_FROM_NAME || 'SEO Analyzer Pro';
  }

  /**
   * Send a welcome email to new users
   */
  async sendWelcomeEmail(to: string, name: string, organizationName: string): Promise<void> {
    const template = this.renderWelcomeTemplate(name, organizationName);

    await emailQueue.add('send', {
      to,
      subject: template.subject,
      template: 'welcome',
      data: {
        name,
        organizationName,
        html: template.html,
        text: template.text,
      },
    });

    logger.info({ to }, 'Welcome email queued');
  }

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(to: string, name: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.APP_URL || 'https://app.seoanalyzer.pro'}/reset-password?token=${resetToken}`;
    const template = this.renderPasswordResetTemplate(name, resetUrl);

    await emailQueue.add('send', {
      to,
      subject: template.subject,
      template: 'password-reset',
      data: {
        name,
        resetUrl,
        html: template.html,
        text: template.text,
      },
    });

    logger.info({ to }, 'Password reset email queued');
  }

  /**
   * Send a scan completion notification
   */
  async sendScanCompleteEmail(
    to: string,
    name: string,
    siteName: string,
    siteUrl: string,
    scanId: string,
    overallScore: number
  ): Promise<void> {
    const scanUrl = `${process.env.APP_URL || 'https://app.seoanalyzer.pro'}/scans/${scanId}`;
    const template = this.renderScanCompleteTemplate(name, siteName, siteUrl, scanUrl, overallScore);

    await emailQueue.add('send', {
      to,
      subject: template.subject,
      template: 'scan-complete',
      data: {
        name,
        siteName,
        siteUrl,
        scanUrl,
        overallScore,
        html: template.html,
        text: template.text,
      },
    });

    logger.info({ to, scanId }, 'Scan complete email queued');
  }

  /**
   * Send an invitation email
   */
  async sendInvitationEmail(
    to: string,
    inviterName: string,
    organizationName: string,
    tempPassword: string
  ): Promise<void> {
    const loginUrl = `${process.env.APP_URL || 'https://app.seoanalyzer.pro'}/login`;
    const template = this.renderInvitationTemplate(inviterName, organizationName, to, tempPassword, loginUrl);

    await emailQueue.add('send', {
      to,
      subject: template.subject,
      template: 'invitation',
      data: {
        inviterName,
        organizationName,
        email: to,
        tempPassword,
        loginUrl,
        html: template.html,
        text: template.text,
      },
    });

    logger.info({ to, organizationName }, 'Invitation email queued');
  }

  /**
   * Send a billing notification email
   */
  async sendBillingNotificationEmail(
    to: string,
    name: string,
    type: 'payment_success' | 'payment_failed' | 'subscription_cancelled',
    details: Record<string, unknown>
  ): Promise<void> {
    const template = this.renderBillingNotificationTemplate(name, type, details);

    await emailQueue.add('send', {
      to,
      subject: template.subject,
      template: 'billing-notification',
      data: {
        name,
        type,
        details,
        html: template.html,
        text: template.text,
      },
    });

    logger.info({ to, type }, 'Billing notification email queued');
  }

  /**
   * Process email job (called by worker)
   */
  async processEmailJob(jobData: EmailJobData): Promise<void> {
    // In production, this would use a real email provider like SendGrid, AWS SES, etc.
    // For now, we'll just log the email
    logger.info(
      {
        to: jobData.to,
        subject: jobData.subject,
        template: jobData.template,
      },
      'Processing email job'
    );

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // In production, integrate with email provider:
    // await sendgrid.send({
    //   to: jobData.to,
    //   from: { email: this.fromEmail, name: this.fromName },
    //   subject: jobData.subject,
    //   html: jobData.data.html,
    //   text: jobData.data.text,
    // });
  }

  // Template rendering methods

  private renderWelcomeTemplate(name: string, organizationName: string): EmailTemplate {
    const subject = `Welcome to SEO Analyzer Pro, ${name}!`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to SEO Analyzer Pro</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Welcome to SEO Analyzer Pro</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Hello ${name},</p>
          <p>Welcome to SEO Analyzer Pro! Your organization <strong>${organizationName}</strong> has been created and you're ready to start optimizing your websites.</p>
          <p>Here's what you can do next:</p>
          <ul>
            <li>Add your first website to analyze</li>
            <li>Run a comprehensive SEO scan</li>
            <li>Set up scheduled scans for continuous monitoring</li>
            <li>Add competitor sites for comparison</li>
          </ul>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL || 'https://app.seoanalyzer.pro'}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Get Started</a>
          </p>
          <p>If you have any questions, feel free to reach out to our support team.</p>
          <p>Best regards,<br>The SEO Analyzer Pro Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>© 2026 Legacy AI / Floyd's Labs. All rights reserved.</p>
          <p>www.LegacyAI.space | www.FloydsLabs.com</p>
        </div>
      </body>
      </html>
    `;
    const text = `
Welcome to SEO Analyzer Pro, ${name}!

Your organization "${organizationName}" has been created and you're ready to start optimizing your websites.

Here's what you can do next:
- Add your first website to analyze
- Run a comprehensive SEO scan
- Set up scheduled scans for continuous monitoring
- Add competitor sites for comparison

Get started at: ${process.env.APP_URL || 'https://app.seoanalyzer.pro'}

Best regards,
The SEO Analyzer Pro Team

© 2026 Legacy AI / Floyd's Labs. All rights reserved.
www.LegacyAI.space | www.FloydsLabs.com
    `;

    return { subject, html, text };
  }

  private renderPasswordResetTemplate(name: string, resetUrl: string): EmailTemplate {
    const subject = 'Reset Your SEO Analyzer Pro Password';
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Reset Password</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f9f9f9; padding: 30px; border-radius: 10px;">
          <h2>Reset Your Password</h2>
          <p>Hello ${name},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          </p>
          <p>This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          <p>Best regards,<br>The SEO Analyzer Pro Team</p>
        </div>
      </body>
      </html>
    `;
    const text = `
Reset Your Password

Hello ${name},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.

Best regards,
The SEO Analyzer Pro Team
    `;

    return { subject, html, text };
  }

  private renderScanCompleteTemplate(
    name: string,
    siteName: string,
    siteUrl: string,
    scanUrl: string,
    overallScore: number
  ): EmailTemplate {
    const scoreColor = overallScore >= 80 ? '#22c55e' : overallScore >= 60 ? '#eab308' : '#ef4444';
    const subject = `Scan Complete: ${siteName} - Score: ${overallScore}/100`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Scan Complete</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f9f9f9; padding: 30px; border-radius: 10px;">
          <h2>SEO Scan Complete</h2>
          <p>Hello ${name},</p>
          <p>Your SEO scan for <strong>${siteName}</strong> (${siteUrl}) has completed.</p>
          <div style="text-align: center; margin: 30px 0; padding: 20px; background: white; border-radius: 10px;">
            <div style="font-size: 48px; font-weight: bold; color: ${scoreColor};">${overallScore}</div>
            <div style="color: #666;">Overall Score</div>
          </div>
          <p style="text-align: center;">
            <a href="${scanUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Full Report</a>
          </p>
          <p>Best regards,<br>The SEO Analyzer Pro Team</p>
        </div>
      </body>
      </html>
    `;
    const text = `
SEO Scan Complete

Hello ${name},

Your SEO scan for "${siteName}" (${siteUrl}) has completed.

Overall Score: ${overallScore}/100

View the full report at: ${scanUrl}

Best regards,
The SEO Analyzer Pro Team
    `;

    return { subject, html, text };
  }

  private renderInvitationTemplate(
    inviterName: string,
    organizationName: string,
    email: string,
    tempPassword: string,
    loginUrl: string
  ): EmailTemplate {
    const subject = `You've been invited to join ${organizationName} on SEO Analyzer Pro`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Invitation</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f9f9f9; padding: 30px; border-radius: 10px;">
          <h2>You've Been Invited!</h2>
          <p>Hello,</p>
          <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on SEO Analyzer Pro.</p>
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p><strong>Your login credentials:</strong></p>
            <p>Email: ${email}</p>
            <p>Temporary Password: <code style="background: #eee; padding: 2px 8px; border-radius: 3px;">${tempPassword}</code></p>
          </div>
          <p style="text-align: center;">
            <a href="${loginUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Log In Now</a>
          </p>
          <p>Please change your password after logging in.</p>
          <p>Best regards,<br>The SEO Analyzer Pro Team</p>
        </div>
      </body>
      </html>
    `;
    const text = `
You've Been Invited!

${inviterName} has invited you to join "${organizationName}" on SEO Analyzer Pro.

Your login credentials:
Email: ${email}
Temporary Password: ${tempPassword}

Log in at: ${loginUrl}

Please change your password after logging in.

Best regards,
The SEO Analyzer Pro Team
    `;

    return { subject, html, text };
  }

  private renderBillingNotificationTemplate(
    name: string,
    type: 'payment_success' | 'payment_failed' | 'subscription_cancelled',
    details: Record<string, unknown>
  ): EmailTemplate {
    let subject: string;
    let content: string;

    switch (type) {
      case 'payment_success':
        subject = 'Payment Successful - SEO Analyzer Pro';
        content = `
          <p>Your payment of <strong>$${details.amount ? (Number(details.amount) / 100).toFixed(2) : '0.00'}</strong> has been processed successfully.</p>
          <p>Your subscription is now active.</p>
        `;
        break;
      case 'payment_failed':
        subject = 'Payment Failed - SEO Analyzer Pro';
        content = `
          <p>We were unable to process your payment.</p>
          <p>Please update your payment method to avoid service interruption.</p>
        `;
        break;
      case 'subscription_cancelled':
        subject = 'Subscription Cancelled - SEO Analyzer Pro';
        content = `
          <p>Your subscription has been cancelled.</p>
          <p>You will continue to have access until the end of your billing period.</p>
        `;
        break;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Billing Notification</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f9f9f9; padding: 30px; border-radius: 10px;">
          <h2>Billing Notification</h2>
          <p>Hello ${name},</p>
          ${content}
          <p>Best regards,<br>The SEO Analyzer Pro Team</p>
        </div>
      </body>
      </html>
    `;
    const text = `
Billing Notification

Hello ${name},

${content.replace(/<[^>]*>/g, '')}

Best regards,
The SEO Analyzer Pro Team
    `;

    return { subject, html, text };
  }
}

export const emailService = new EmailService();
