import { loadConfig, getPool, closePool, createLogger } from '@nself-family/shared';
import { SchedulerWorker } from './worker.js';

const config = loadConfig();
const logger = createLogger(config, 'scheduler');
const pool = getPool(config);

const worker = new SchedulerWorker(pool, logger, 2000);

// Register built-in job handlers
worker.registerHandler('media.process', async (job) => {
  logger.info({ mediaItemId: job.payload.media_item_id }, 'Processing media item');
  // Media processing logic (thumbnail generation, etc.)
  // This will be extended in Phase 2/3 when sharp is available
});

worker.registerHandler('audit.cleanup', async () => {
  logger.info('Running audit event cleanup');
  // Cleanup old audit events beyond retention period
});

worker.registerHandler('token.cleanup', async () => {
  logger.info('Cleaning up expired refresh tokens');
  await pool.query('SELECT auth.cleanup_expired_tokens()');
});

// Start worker
logger.info('Scheduler service starting');
worker.start().catch((err) => {
  logger.error({ err }, 'Scheduler worker crashed');
  process.exit(1);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Received shutdown signal');
  worker.stop();
  await closePool();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
