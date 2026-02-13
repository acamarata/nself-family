import type { Pool } from '@nself-family/shared';

export interface AuditEventInput {
  family_id?: string | null;
  event_type: string;
  actor_id?: string | null;
  subject_id?: string | null;
  subject_type?: string | null;
  old_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * Write an immutable audit event record.
 * @param pool - Database pool
 * @param event - Audit event data
 * @returns Created audit event ID
 */
export async function writeAuditEvent(pool: Pool, event: AuditEventInput): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO public.audit_events
       (family_id, event_type, actor_id, subject_id, subject_type, old_state, new_state, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::inet, $9)
     RETURNING id`,
    [
      event.family_id ?? null,
      event.event_type,
      event.actor_id ?? null,
      event.subject_id ?? null,
      event.subject_type ?? null,
      event.old_state ? JSON.stringify(event.old_state) : null,
      event.new_state ? JSON.stringify(event.new_state) : null,
      event.ip_address ?? null,
      event.user_agent ?? null,
    ],
  );
  return result.rows[0].id;
}

/**
 * Query audit events with pagination.
 * @param pool - Database pool
 * @param filters - Query filters
 * @param limit - Max results (default 50)
 * @param offset - Skip N results (default 0)
 * @returns Array of audit event records
 */
export async function queryAuditEvents(
  pool: Pool,
  filters: {
    family_id?: string;
    event_type?: string;
    actor_id?: string;
    subject_type?: string;
    since?: Date;
  },
  limit: number = 50,
  offset: number = 0,
): Promise<Array<Record<string, unknown>>> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.family_id) {
    conditions.push(`family_id = $${paramIndex++}`);
    params.push(filters.family_id);
  }
  if (filters.event_type) {
    conditions.push(`event_type = $${paramIndex++}`);
    params.push(filters.event_type);
  }
  if (filters.actor_id) {
    conditions.push(`actor_id = $${paramIndex++}`);
    params.push(filters.actor_id);
  }
  if (filters.subject_type) {
    conditions.push(`subject_type = $${paramIndex++}`);
    params.push(filters.subject_type);
  }
  if (filters.since) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(filters.since.toISOString());
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit, offset);
  const result = await pool.query(
    `SELECT * FROM public.audit_events ${where}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    params,
  );

  return result.rows;
}
