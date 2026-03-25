/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import 'dotenv/config';
import { buildApp } from './app.js';
import { logger } from './lib/logger.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start(): Promise<void> {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    logger.info(`🚀 SEO Analyzer Pro API running on http://${HOST}:${PORT}`);
    logger.info(`📚 API Documentation: http://${HOST}:${PORT}/documentation`);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }

  // Graceful shutdown handlers
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await app.close();
      logger.info('Server closed');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
