import { loadConfig, getPool, closePool, createLogger } from '@nself-family/shared';
import { buildApp } from './app.js';

const config = loadConfig();
const logger = createLogger(config, 'auth');
const pool = getPool(config);

const app = await buildApp({
  pool,
  logger,
  jwtSecret: config.JWT_SECRET,
  accessTokenExpiry: config.JWT_ACCESS_TOKEN_EXPIRES_IN,
  refreshTokenExpiry: config.JWT_REFRESH_TOKEN_EXPIRES_IN,
  isDemoMode: config.DEMO_MODE,
});

const port = config.AUTH_SERVICE_PORT;

try {
  await app.listen({ port, host: '0.0.0.0' });
  logger.info({ port }, `Auth service listening on port ${port}`);
} catch (err) {
  logger.error({ err }, 'Failed to start auth service');
  process.exit(1);
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Received shutdown signal');
  await app.close();
  await closePool();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
