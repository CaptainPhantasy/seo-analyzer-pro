/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import { Queue, Worker, Job } from 'bullmq';
import { redis } from './redis.js';
import { logger } from './logger.js';

// Queue names
export const QUEUE_NAMES = {
  SCAN: 'scan-queue',
  EMAIL: 'email-queue',
  WEBHOOK: 'webhook-queue',
} as const;

// Scan job data type
export interface ScanJobData {
  scanId: string;
  siteId: string;
  url: string;
  userId: string;
  orgId: string;
}

// Email job data type
export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

// Webhook job data type
export interface WebhookJobData {
  orgId: string;
  event: string;
  payload: Record<string, unknown>;
}

// Create queues
export const scanQueue = new Queue<ScanJobData>(QUEUE_NAMES.SCAN, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 7 * 24 * 3600, // Keep completed jobs for 7 days
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 30 * 24 * 3600, // Keep failed jobs for 30 days
    },
  },
});

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL, {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600,
    },
    removeOnFail: {
      age: 7 * 24 * 3600,
    },
  },
});

export const webhookQueue = new Queue<WebhookJobData>(QUEUE_NAMES.WEBHOOK, {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600,
    },
    removeOnFail: {
      age: 7 * 24 * 3600,
    },
  },
});

// Helper to create scan worker
export function createScanWorker(processor: (job: Job<ScanJobData>) => Promise<void>): Worker<ScanJobData> {
  const worker = new Worker<ScanJobData>(QUEUE_NAMES.SCAN, processor, {
    connection: redis,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, scanId: job.data.scanId }, 'Scan job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, scanId: job?.data?.scanId, error: err.message }, 'Scan job failed');
  });

  return worker;
}

// Helper to create email worker
export function createEmailWorker(processor: (job: Job<EmailJobData>) => Promise<void>): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(QUEUE_NAMES.EMAIL, processor, {
    connection: redis,
    concurrency: 10,
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, to: job.data.to }, 'Email job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, to: job?.data?.to, error: err.message }, 'Email job failed');
  });

  return worker;
}

// Helper to create webhook worker
export function createWebhookWorker(
  processor: (job: Job<WebhookJobData>) => Promise<void>
): Worker<WebhookJobData> {
  const worker = new Worker<WebhookJobData>(QUEUE_NAMES.WEBHOOK, processor, {
    connection: redis,
    concurrency: 20,
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, event: job.data.event }, 'Webhook job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, event: job?.data?.event, error: err.message }, 'Webhook job failed');
  });

  return worker;
}

// Queue management utilities
export async function getQueueStats(): Promise<{
  scan: { waiting: number; active: number; completed: number; failed: number };
  email: { waiting: number; active: number; completed: number; failed: number };
  webhook: { waiting: number; active: number; completed: number; failed: number };
}> {
  const [scanStats, emailStats, webhookStats] = await Promise.all([
    Promise.all([
      scanQueue.getWaitingCount(),
      scanQueue.getActiveCount(),
      scanQueue.getCompletedCount(),
      scanQueue.getFailedCount(),
    ]),
    Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount(),
    ]),
    Promise.all([
      webhookQueue.getWaitingCount(),
      webhookQueue.getActiveCount(),
      webhookQueue.getCompletedCount(),
      webhookQueue.getFailedCount(),
    ]),
  ]);

  return {
    scan: {
      waiting: scanStats[0],
      active: scanStats[1],
      completed: scanStats[2],
      failed: scanStats[3],
    },
    email: {
      waiting: emailStats[0],
      active: emailStats[1],
      completed: emailStats[2],
      failed: emailStats[3],
    },
    webhook: {
      waiting: webhookStats[0],
      active: webhookStats[1],
      completed: webhookStats[2],
      failed: webhookStats[3],
    },
  };
}

export async function closeQueues(): Promise<void> {
  await Promise.all([scanQueue.close(), emailQueue.close(), webhookQueue.close()]);
  logger.info('All queues closed');
}
