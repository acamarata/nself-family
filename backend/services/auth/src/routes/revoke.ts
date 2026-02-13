import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Pool, JwtPayload } from '@nself-family/shared';
import { hashRefreshToken, revokeAllUserTokens, findRefreshToken, revokeRefreshToken } from '../lib/tokens.js';
import { createAuthMiddleware } from '../middleware/authenticate.js';

const revokeBody = z.object({
  refresh_token: z.string().min(1).optional(),
  revoke_all: z.boolean().optional().default(false),
});

/**
 * Revoke refresh tokens. Can revoke a specific token or all tokens for the user.
 * POST /auth/revoke
 * Requires authentication.
 * @param app - Fastify instance
 * @param pool - Database pool
 * @param jwtSecret - JWT signing secret
 */
export function revokeRoute(app: FastifyInstance, pool: Pool, jwtSecret: string): void {
  const authenticate = createAuthMiddleware(jwtSecret);

  app.post('/auth/revoke', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = revokeBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
      });
    }

    const user = request.user as JwtPayload;

    if (parsed.data.revoke_all) {
      await revokeAllUserTokens(pool, user.sub);
      return reply.code(200).send({ data: { message: 'All refresh tokens revoked' } });
    }

    if (parsed.data.refresh_token) {
      const tokenHash = hashRefreshToken(parsed.data.refresh_token);
      const token = await findRefreshToken(pool, tokenHash);

      if (token && token.user_id === user.sub) {
        await revokeRefreshToken(pool, token.id);
      }
    }

    return reply.code(200).send({ data: { message: 'Token revoked' } });
  });
}
