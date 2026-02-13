import type { FastifyInstance } from 'fastify';
import type { Pool, JwtPayload } from '@nself-family/shared';
import { revokeAllUserTokens, deactivateSession, deactivateAllSessions } from '../lib/tokens.js';
import { createAuthMiddleware } from '../middleware/authenticate.js';

/**
 * Logout: deactivate session and revoke associated refresh tokens.
 * POST /auth/logout
 * Requires authentication.
 * @param app - Fastify instance
 * @param pool - Database pool
 * @param jwtSecret - JWT signing secret
 */
export function logoutRoute(app: FastifyInstance, pool: Pool, jwtSecret: string): void {
  const authenticate = createAuthMiddleware(jwtSecret);

  app.post('/auth/logout', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user as JwtPayload;

    // Deactivate current session
    await deactivateSession(pool, user.session_id);

    // Revoke all refresh tokens for this user
    await revokeAllUserTokens(pool, user.sub);

    // Deactivate all sessions
    await deactivateAllSessions(pool, user.sub);

    return reply.code(200).send({ data: { message: 'Logged out successfully' } });
  });
}
