import type { FastifyInstance } from 'fastify';
import type { Pool, JwtPayload } from '@nself-family/shared';
import { createAuthMiddleware } from '../middleware/authenticate.js';

/**
 * Get current user profile and app roles.
 * GET /auth/me
 * Requires authentication.
 * @param app - Fastify instance
 * @param pool - Database pool
 * @param jwtSecret - JWT signing secret
 */
export function meRoute(app: FastifyInstance, pool: Pool, jwtSecret: string): void {
  const authenticate = createAuthMiddleware(jwtSecret);

  app.get('/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    const jwt = request.user as JwtPayload;

    const userResult = await pool.query<{
      id: string;
      email: string;
      display_name: string | null;
      avatar_url: string | null;
      profile: Record<string, unknown>;
      email_verified: boolean;
      created_at: Date;
    }>(
      `SELECT id, email, display_name, avatar_url, profile, email_verified, created_at
       FROM public.users WHERE id = $1 AND is_active = true`,
      [jwt.sub],
    );

    const user = userResult.rows[0];
    if (!user) {
      return reply.code(404).send({
        error: { code: 'USER_NOT_FOUND', message: 'User account not found or inactive' },
      });
    }

    // Fetch per-app roles
    const rolesResult = await pool.query<{
      app_key: string;
      app_name: string;
      role: string;
      permissions: Record<string, unknown>;
    }>(
      `SELECT a.app_key, a.name AS app_name, uar.role, uar.permissions
       FROM public.user_app_roles uar
       JOIN public.apps a ON a.id = uar.app_id
       WHERE uar.user_id = $1 AND a.is_active = true`,
      [jwt.sub],
    );

    // Fetch family memberships
    const membershipsResult = await pool.query<{
      family_id: string;
      family_name: string;
      role: string;
      lifecycle_state: string;
    }>(
      `SELECT f.id AS family_id, f.name AS family_name, fm.role, fm.lifecycle_state
       FROM public.family_members fm
       JOIN public.families f ON f.id = fm.family_id
       WHERE fm.user_id = $1 AND fm.lifecycle_state = 'active' AND f.is_active = true`,
      [jwt.sub],
    );

    return reply.code(200).send({
      data: {
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          profile: user.profile,
          email_verified: user.email_verified,
          created_at: user.created_at,
        },
        app_roles: rolesResult.rows,
        families: membershipsResult.rows,
      },
    });
  });
}
