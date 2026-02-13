import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Pool } from '@nself-family/shared';
import { signAccessToken, generateRefreshToken } from '../lib/jwt.js';
import {
  hashRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeTokenFamily,
  storeRefreshToken,
} from '../lib/tokens.js';

const refreshBody = z.object({
  refresh_token: z.string().min(1),
});

/**
 * Refresh access token using a valid refresh token.
 * Implements token rotation: old refresh token is revoked, new one issued.
 * Detects reuse of already-revoked tokens and revokes the entire family.
 * POST /auth/refresh
 * @param app - Fastify instance
 * @param pool - Database pool
 * @param jwtSecret - JWT signing secret
 * @param accessTokenExpiry - Access token lifetime in seconds
 * @param refreshTokenExpiry - Refresh token lifetime in seconds
 */
export function refreshRoute(
  app: FastifyInstance,
  pool: Pool,
  jwtSecret: string,
  accessTokenExpiry: number,
  refreshTokenExpiry: number,
): void {
  app.post('/auth/refresh', async (request, reply) => {
    const parsed = refreshBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
      });
    }

    const tokenHash = hashRefreshToken(parsed.data.refresh_token);

    // Check if this is a reused (already-revoked) token
    const reusedCheck = await pool.query<{ family_chain: string }>(
      `SELECT family_chain FROM auth.refresh_tokens
       WHERE token_hash = $1 AND revoked_at IS NOT NULL`,
      [tokenHash],
    );

    if (reusedCheck.rows.length > 0) {
      // Token reuse detected — revoke entire family (suspicious behavior)
      await revokeTokenFamily(pool, reusedCheck.rows[0].family_chain);
      return reply.code(401).send({
        error: { code: 'TOKEN_REUSE', message: 'Refresh token reuse detected. All sessions revoked.' },
      });
    }

    // Find valid token
    const storedToken = await findRefreshToken(pool, tokenHash);
    if (!storedToken) {
      return reply.code(401).send({
        error: { code: 'INVALID_TOKEN', message: 'Refresh token is invalid or expired' },
      });
    }

    // Look up user
    const userResult = await pool.query<{ id: string; email: string; is_active: boolean }>(
      'SELECT id, email, is_active FROM public.users WHERE id = $1',
      [storedToken.user_id],
    );

    const user = userResult.rows[0];
    if (!user || !user.is_active) {
      await revokeRefreshToken(pool, storedToken.id);
      return reply.code(401).send({
        error: { code: 'ACCOUNT_DISABLED', message: 'Account is no longer active' },
      });
    }

    // Rotate: revoke old token, issue new one
    await revokeRefreshToken(pool, storedToken.id);

    const newAccessToken = signAccessToken(user.id, user.email, storedToken.session_id, jwtSecret, accessTokenExpiry);
    const newRawRefreshToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(newRawRefreshToken);

    await storeRefreshToken(
      pool,
      user.id,
      newTokenHash,
      storedToken.session_id,
      storedToken.family_chain,
      refreshTokenExpiry,
    );

    // Update session activity
    await pool.query(
      'UPDATE auth.sessions SET last_active_at = now() WHERE id = $1',
      [storedToken.session_id],
    );

    return reply.code(200).send({
      data: {
        tokens: {
          access_token: newAccessToken,
          refresh_token: newRawRefreshToken,
          expires_in: accessTokenExpiry,
          token_type: 'Bearer' as const,
        },
      },
    });
  });
}
