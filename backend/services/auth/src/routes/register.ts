import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Pool } from '@nself-family/shared';
import { hashPassword } from '../lib/password.js';
import { signAccessToken, generateRefreshToken } from '../lib/jwt.js';
import { hashRefreshToken, storeRefreshToken, createSession } from '../lib/tokens.js';

const registerBody = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  display_name: z.string().min(1).max(100).optional(),
});

/**
 * Register a new user account.
 * POST /auth/register
 * @param app - Fastify instance
 * @param pool - Database pool
 * @param jwtSecret - JWT signing secret
 * @param accessTokenExpiry - Access token lifetime in seconds
 * @param refreshTokenExpiry - Refresh token lifetime in seconds
 */
export function registerRoute(
  app: FastifyInstance,
  pool: Pool,
  jwtSecret: string,
  accessTokenExpiry: number,
  refreshTokenExpiry: number,
): void {
  app.post('/auth/register', async (request, reply) => {
    const parsed = registerBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parsed.error.flatten() },
      });
    }

    const { email, password, display_name } = parsed.data;

    // Check for existing user
    const existing = await pool.query(
      'SELECT id FROM public.users WHERE lower(email) = lower($1)',
      [email],
    );

    if (existing.rows.length > 0) {
      return reply.code(409).send({
        error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' },
      });
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const userResult = await pool.query<{ id: string; email: string }>(
      `INSERT INTO public.users (email, password_hash, display_name, email_verified)
       VALUES (lower($1), $2, $3, false)
       RETURNING id, email`,
      [email, passwordHash, display_name ?? null],
    );

    const user = userResult.rows[0];
    const ipAddress = request.ip || null;
    const userAgent = request.headers['user-agent'] || null;

    // Create session
    const sessionId = await createSession(pool, user.id, ipAddress, userAgent);

    // Issue tokens
    const accessToken = signAccessToken(user.id, user.email, sessionId, jwtSecret, accessTokenExpiry);
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const familyChain = crypto.randomUUID();

    await storeRefreshToken(pool, user.id, tokenHash, sessionId, familyChain, refreshTokenExpiry);

    // Update last_login_at
    await pool.query('UPDATE public.users SET last_login_at = now() WHERE id = $1', [user.id]);

    return reply.code(201).send({
      data: {
        user: { id: user.id, email: user.email },
        tokens: {
          access_token: accessToken,
          refresh_token: rawRefreshToken,
          expires_in: accessTokenExpiry,
          token_type: 'Bearer' as const,
        },
      },
    });
  });
}
