import { loadConfig, getPool, closePool, createLogger } from '@nself-family/shared';
import { buildApiApp } from './app.js';

const config = loadConfig();
const logger = createLogger(config, 'api');
const pool = getPool(config);

const app = await buildApiApp({
  pool,
  logger,
  jwtSecret: config.JWT_SECRET,
  env: config.ENV,
  isDemoMode: config.DEMO_MODE,
});

const port = config.API_SERVICE_PORT;

try {
  await app.listen({ port, host: '0.0.0.0' });
  logger.info({ port }, `API service listening on port ${port}`);
} catch (err) {
  logger.error({ err }, 'Failed to start API service');
  process.exit(1);
}

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Received shutdown signal');
  await app.close();
  await closePool();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
