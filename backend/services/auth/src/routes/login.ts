import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Pool } from '@nself-family/shared';
import { verifyPassword } from '../lib/password.js';
import { signAccessToken, generateRefreshToken } from '../lib/jwt.js';
import { hashRefreshToken, storeRefreshToken, createSession } from '../lib/tokens.js';

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Authenticate user with email and password.
 * POST /auth/login
 * @param app - Fastify instance
 * @param pool - Database pool
 * @param jwtSecret - JWT signing secret
 * @param accessTokenExpiry - Access token lifetime in seconds
 * @param refreshTokenExpiry - Refresh token lifetime in seconds
 */
export function loginRoute(
  app: FastifyInstance,
  pool: Pool,
  jwtSecret: string,
  accessTokenExpiry: number,
  refreshTokenExpiry: number,
): void {
  app.post('/auth/login', async (request, reply) => {
    const parsed = loginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parsed.error.flatten() },
      });
    }

    const { email, password } = parsed.data;

    // Look up user
    const userResult = await pool.query<{
      id: string;
      email: string;
      password_hash: string;
      is_active: boolean;
    }>(
      'SELECT id, email, password_hash, is_active FROM public.users WHERE lower(email) = lower($1)',
      [email],
    );

    const user = userResult.rows[0];
    if (!user) {
      return reply.code(401).send({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    if (!user.is_active) {
      return reply.code(403).send({
        error: { code: 'ACCOUNT_DISABLED', message: 'Account has been disabled' },
      });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return reply.code(401).send({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

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

    return reply.code(200).send({
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
