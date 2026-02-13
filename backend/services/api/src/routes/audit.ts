import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Pool, JwtPayload } from '@nself-family/shared';
import { queryAuditEvents } from '../lib/audit.js';

const auditQuerySchema = z.object({
  family_id: z.string().uuid().optional(),
  event_type: z.string().optional(),
  actor_id: z.string().uuid().optional(),
  subject_type: z.string().optional(),
  since: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * Audit events query route.
 * GET /api/audit/events
 * @param app - Fastify instance
 * @param pool - Database pool
 */
export function auditRoute(app: FastifyInstance, pool: Pool): void {
  app.get('/api/audit/events', async (request, reply) => {
    const user = request.user as JwtPayload;
    if (!user) {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const parsed = auditQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', details: parsed.error.flatten() },
      });
    }

    const { limit, offset, since, ...filters } = parsed.data;

    const events = await queryAuditEvents(
      pool,
      { ...filters, since: since ? new Date(since) : undefined },
      limit,
      offset,
    );

    return reply.code(200).send({ data: { events, count: events.length } });
  });
}
