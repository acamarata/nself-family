import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import type { Pool, Logger } from '@nself-family/shared';
import { createAuthMiddleware } from './middleware/authenticate.js';
import { uploadRoute } from './routes/upload.js';
import { auditRoute } from './routes/audit.js';

export interface ApiAppOptions {
  pool: Pool;
  logger: Logger;
  jwtSecret: string;
  env: string;
  isDemoMode: boolean;
}

/**
 * Create and configure the Fastify API service.
 * @param options - Application configuration
 * @returns Configured Fastify instance
 */
export async function buildApiApp(options: ApiAppOptions): Promise<FastifyInstance> {
  const { pool, logger, jwtSecret, env, isDemoMode } = options;

  const app = Fastify({
    logger: false,
    trustProxy: true,
    bodyLimit: 52428800, // 50MB for file uploads
  });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(multipart, { limits: { fileSize: 52428800 } });

  // Auth middleware for all API routes
  const authenticate = createAuthMiddleware(jwtSecret);
  app.addHook('preHandler', async (request, reply) => {
    // Skip auth for health checks
    if (request.url === '/health' || request.url === '/ready') return;
    await authenticate(request, reply);
  });

  // Demo mode — block mutations
  if (isDemoMode) {
    app.addHook('preHandler', async (request, reply) => {
      if (request.method !== 'GET' && request.url !== '/health' && request.url !== '/ready') {
        reply.code(403).send({
          error: {
            code: 'DEMO_MODE',
            message: 'This action is disabled in demo mode. Fork the repo to deploy your own instance.',
          },
        });
      }
    });
  }

  // Health endpoints
  app.get('/health', async () => ({ status: 'ok', service: 'api', timestamp: new Date().toISOString() }));
  app.get('/ready', async () => {
    try {
      await pool.query('SELECT 1');
      return { status: 'ready', service: 'api' };
    } catch {
      return { status: 'not_ready', service: 'api' };
    }
  });

  // Routes
  uploadRoute(app, pool, env);
  auditRoute(app, pool);

  // Error handler
  app.setErrorHandler((error, _request, reply) => {
    logger.error({ err: error }, 'Unhandled error');
    reply.code(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  });

  return app;
}
