/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import { Job } from 'bullmq';
import { createScanWorker, ScanJobData } from '../lib/queue.js';
import { scanService } from '../services/scan.service.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

/**
 * Scan Worker - Processes SEO scan jobs
 */
export function startScanWorker() {
  const worker = createScanWorker(async (job: Job<ScanJobData>) => {
    const { scanId, siteId, url, userId, orgId } = job.data;

    logger.info({ jobId: job.id, scanId, siteId }, 'Processing scan job');

    try {
      // Get site settings
      const site = await prisma.site.findUnique({
        where: { id: siteId },
        select: { settings: true },
      });

      const settings = site?.settings as Record<string, unknown> | null;

      // Run the scan
      const result = await scanService.runScan(scanId, {
        url,
        crawlDepth: (settings?.crawlDepth as number) ?? 2,
        includePaths: settings?.includePaths as string[] | undefined,
        excludePaths: settings?.excludePaths as string[] | undefined,
        userAgent: settings?.userAgent as string | undefined,
        timeout: (settings?.timeout as number) ?? 30000,
      });

      // Trigger notifications
      await triggerScanNotifications(orgId, userId, scanId, siteId, url, result.scores.overall);

      logger.info({ jobId: job.id, scanId, score: result.scores.overall }, 'Scan job completed');

      return result;
    } catch (error) {
      const err = error as Error;

      logger.error({ jobId: job.id, scanId, error: err.message }, 'Scan job failed');

      // Update scan status
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: err.message,
        },
      });

      throw error;
    }
  });

  logger.info('Scan worker started');

  return worker;
}

/**
 * Trigger notifications for completed scans
 */
async function triggerScanNotifications(
  orgId: string,
  userId: string,
  scanId: string,
  siteId: string,
  siteUrl: string,
  overallScore: number
): Promise<void> {
  // Get site name
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { name: true },
  });

  // Get user for notification
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!user || !site) return;

  // Check organization notification settings
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  });

  const settings = org?.settings as Record<string, unknown> | null;
  const notifications = settings?.notifications as Record<string, boolean> | undefined;

  // Send email notification if enabled
  if (notifications?.email !== false) {
    // Queue email notification
    const { emailQueue } = await import('../lib/queue.js');
    await emailQueue.add('scan-complete', {
      to: user.email,
      subject: `Scan Complete: ${site.name} - Score: ${overallScore}/100`,
      template: 'scan-complete',
      data: {
        name: user.name || 'User',
        siteName: site.name,
        siteUrl,
        scanId,
        overallScore,
      },
    });
  }

  // Check for integrations to notify
  const integrations = await prisma.integration.findMany({
    where: {
      orgId,
      enabled: true,
      type: { in: ['SLACK', 'WEBHOOK', 'ZAPIER'] },
    },
  });

  for (const integration of integrations) {
    const config = integration.config as Record<string, unknown>;
    const webhookUrl = (config.webhookUrl || config.url) as string | undefined;

    if (webhookUrl) {
      // Queue webhook notification
      const { webhookQueue } = await import('../lib/queue.js');
      await webhookQueue.add('deliver', {
        orgId,
        event: 'scan.completed',
        payload: {
          scanId,
          siteId,
          siteName: site.name,
          siteUrl,
          overallScore,
          completedAt: new Date().toISOString(),
        },
      });
    }
  }
}

/**
 * Process scheduled scans
 * This should be called periodically by a cron job or scheduler
 */
export async function processScheduledScans(): Promise<number> {
  const now = new Date();

  // Find all scheduled scans that are due
  const dueScans = await prisma.scheduledScan.findMany({
    where: {
      enabled: true,
      nextRun: { lte: now },
    },
    include: {
      site: {
        select: {
          id: true,
          url: true,
          orgId: true,
        },
      },
    },
  });

  if (dueScans.length === 0) {
    return 0;
  }

  logger.info({ count: dueScans.length }, 'Processing scheduled scans');

  const { scanQueue } = await import('../lib/queue.js');

  for (const scheduledScan of dueScans) {
    // Create scan record
    const scan = await prisma.scan.create({
      data: {
        siteId: scheduledScan.siteId,
        status: 'PENDING',
      },
    });

    // Queue the scan job
    await scanQueue.add('scheduled-scan', {
      scanId: scan.id,
      siteId: scheduledScan.siteId,
      url: scheduledScan.site.url,
      userId: 'system',
      orgId: scheduledScan.site.orgId,
    });

    // Calculate next run time
    let nextRun = new Date(now);
    switch (scheduledScan.frequency) {
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

    // Update next run time
    await prisma.scheduledScan.update({
      where: { id: scheduledScan.id },
      data: { nextRun },
    });

    logger.info(
      {
        scheduledScanId: scheduledScan.id,
        scanId: scan.id,
        nextRun,
      },
      'Scheduled scan triggered'
    );
  }

  return dueScans.length;
}

/**
 * Start the scan scheduler
 */
export function startScanScheduler(intervalMs = 60000): NodeJS.Timeout {
  const interval = setInterval(async () => {
    try {
      const count = await processScheduledScans();
      if (count > 0) {
        logger.info({ count }, 'Processed scheduled scans');
      }
    } catch (error) {
      logger.error({ error }, 'Error processing scheduled scans');
    }
  }, intervalMs);

  logger.info({ intervalMs }, 'Scan scheduler started');

  return interval;
}
