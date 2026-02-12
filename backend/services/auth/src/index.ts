import Fastify from 'fastify';
import { z } from 'zod';

/**
 * Error response schema for all auth endpoints
 */
export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Creates and configures the auth service Fastify instance
 * @returns Configured Fastify server instance
 */
export function createAuthServer() {
  const server = Fastify({
    logger: true,
  });

  /**
   * POST /auth/register - User registration endpoint
   * Returns 501 Not Implemented (scaffolding only)
   */
  server.post('/auth/register', async (request, reply) => {
    return reply.code(501).send({
      code: 'NOT_IMPLEMENTED',
      message: 'Registration endpoint not yet implemented',
    } satisfies ErrorResponse);
  });

  /**
   * POST /auth/login - User login endpoint
   * Returns 501 Not Implemented (scaffolding only)
   */
  server.post('/auth/login', async (request, reply) => {
    return reply.code(501).send({
      code: 'NOT_IMPLEMENTED',
      message: 'Login endpoint not yet implemented',
    } satisfies ErrorResponse);
  });

  /**
   * POST /auth/refresh - Token refresh endpoint
   * Returns 501 Not Implemented (scaffolding only)
   */
  server.post('/auth/refresh', async (request, reply) => {
    return reply.code(501).send({
      code: 'NOT_IMPLEMENTED',
      message: 'Token refresh endpoint not yet implemented',
    } satisfies ErrorResponse);
  });

  /**
   * POST /auth/revoke - Token revocation endpoint
   * Returns 501 Not Implemented (scaffolding only)
   */
  server.post('/auth/revoke', async (request, reply) => {
    return reply.code(501).send({
      code: 'NOT_IMPLEMENTED',
      message: 'Token revocation endpoint not yet implemented',
    } satisfies ErrorResponse);
  });

  /**
   * POST /auth/logout - User logout endpoint
   * Returns 501 Not Implemented (scaffolding only)
   */
  server.post('/auth/logout', async (request, reply) => {
    return reply.code(501).send({
      code: 'NOT_IMPLEMENTED',
      message: 'Logout endpoint not yet implemented',
    } satisfies ErrorResponse);
  });

  return server;
}

/**
 * Main entrypoint for the auth service
 * Starts the Fastify server on port 3001
 */
async function main() {
  const server = createAuthServer();

  try {
    await server.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Auth service listening on port 3001');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
