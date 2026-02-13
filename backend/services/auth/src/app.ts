import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { Pool } from '@nself-family/shared';
import type { Logger } from '@nself-family/shared';
import { registerRoute } from './routes/register.js';
import { loginRoute } from './routes/login.js';
import { refreshRoute } from './routes/refresh.js';
import { revokeRoute } from './routes/revoke.js';
import { logoutRoute } from './routes/logout.js';
import { meRoute } from './routes/me.js';

export interface AppOptions {
  pool: Pool;
  logger: Logger;
  jwtSecret: string;
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
  isDemoMode: boolean;
}

/**
 * Create and configure the Fastify auth service application.
 * @param options - Application configuration options
 * @returns Configured Fastify instance
 */
export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const { pool, logger, jwtSecret, accessTokenExpiry, refreshTokenExpiry, isDemoMode } = options;

  const app = Fastify({
    logger: false, // We use our own pino logger
    trustProxy: true,
  });

  // Security plugins
  await app.register(cors, { origin: true, credentials: true });
  await app.register(helmet, { contentSecurityPolicy: false });

  // Demo mode middleware — block mutations in production demo
  if (isDemoMode) {
    app.addHook('preHandler', async (request, reply) => {
      const mutationPaths = ['/auth/register'];
      if (mutationPaths.includes(request.url)) {
        reply.code(403).send({
          error: {
            code: 'DEMO_MODE',
            message: 'Registration is disabled in demo mode. Fork the repo to deploy your own instance.',
          },
        });
      }
    });
  }

  // Health check endpoints
  app.get('/health', async () => ({ status: 'ok', service: 'auth', timestamp: new Date().toISOString() }));
  app.get('/ready', async () => {
    try {
      await pool.query('SELECT 1');
      return { status: 'ready', service: 'auth' };
    } catch {
      return { status: 'not_ready', service: 'auth' };
    }
  });

  // Auth routes
  registerRoute(app, pool, jwtSecret, accessTokenExpiry, refreshTokenExpiry);
  loginRoute(app, pool, jwtSecret, accessTokenExpiry, refreshTokenExpiry);
  refreshRoute(app, pool, jwtSecret, accessTokenExpiry, refreshTokenExpiry);
  revokeRoute(app, pool, jwtSecret);
  logoutRoute(app, pool, jwtSecret);
  meRoute(app, pool, jwtSecret);

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    logger.error({ err: error }, 'Unhandled error');
    reply.code(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  });

  return app;
}
