import type { FastifyInstance } from 'fastify';
import { getPool } from '@nself-family/shared';
import { writeAuditEvent } from '../lib/audit.js';
import { updateFamilySettings, getFamilySettings } from '../lib/visibility.js';

/**
 * Admin and governance routes.
 * All routes require OWNER or ADMIN role.
 */
export async function adminRoutes(app: FastifyInstance) {
  // Get family settings
  app.get('/api/admin/:familyId/settings', async (request, reply) => {
    const { familyId } = request.params as { familyId: string };
    const user = (request as any).user;
    const pool = getPool();

    // Check admin role
    const { rows } = await pool.query(
      `SELECT role FROM public.family_members
       WHERE family_id = $1 AND user_id = $2 AND lifecycle_state = 'active'`,
      [familyId, user.sub],
    );

    if (rows.length === 0 || !['OWNER', 'ADMIN'].includes(rows[0].role)) {
      return reply.status(403).send({ error: { message: 'Admin access required', code: 'FORBIDDEN' } });
    }

    const settings = await getFamilySettings(pool, familyId);
    return { data: settings };
  });

  // Update family settings
  app.put('/api/admin/:familyId/settings', async (request, reply) => {
    const { familyId } = request.params as { familyId: string };
    const user = (request as any).user;
    const pool = getPool();
    const updates = request.body as Record<string, unknown>;

    // Check admin role
    const { rows } = await pool.query(
      `SELECT role FROM public.family_members
       WHERE family_id = $1 AND user_id = $2 AND lifecycle_state = 'active'`,
      [familyId, user.sub],
    );

    if (rows.length === 0 || !['OWNER', 'ADMIN'].includes(rows[0].role)) {
      return reply.status(403).send({ error: { message: 'Admin access required', code: 'FORBIDDEN' } });
    }

    const oldSettings = await getFamilySettings(pool, familyId);
    await updateFamilySettings(pool, familyId, updates, user.sub);

    await writeAuditEvent(pool, {
      family_id: familyId,
      event_type: 'family.settings_updated',
      actor_id: user.sub,
      old_state: oldSettings ?? {},
      new_state: updates,
    });

    const newSettings = await getFamilySettings(pool, familyId);
    return { data: newSettings };
  });

  // Change member role
  app.put('/api/admin/:familyId/members/:userId/role', async (request, reply) => {
    const { familyId, userId } = request.params as { familyId: string; userId: string };
    const user = (request as any).user;
    const pool = getPool();
    const { role } = request.body as { role: string };

    // Check OWNER role (only owners can change roles)
    const { rows: adminCheck } = await pool.query(
      `SELECT role FROM public.family_members
       WHERE family_id = $1 AND user_id = $2 AND lifecycle_state = 'active'`,
      [familyId, user.sub],
    );

    if (adminCheck.length === 0 || adminCheck[0].role !== 'OWNER') {
      return reply.status(403).send({ error: { message: 'Owner access required', code: 'FORBIDDEN' } });
    }

    // Get current role for audit
    const { rows: memberCheck } = await pool.query(
      'SELECT role FROM public.family_members WHERE family_id = $1 AND user_id = $2',
      [familyId, userId],
    );

    if (memberCheck.length === 0) {
      return reply.status(404).send({ error: { message: 'Member not found', code: 'NOT_FOUND' } });
    }

    await pool.query(
      'UPDATE public.family_members SET role = $1 WHERE family_id = $2 AND user_id = $3',
      [role, familyId, userId],
    );

    await writeAuditEvent(pool, {
      family_id: familyId,
      event_type: 'member.role_changed',
      actor_id: user.sub,
      subject_id: userId,
      subject_type: 'user',
      old_state: { role: memberCheck[0].role },
      new_state: { role },
    });

    return { data: { user_id: userId, role } };
  });

  // Remove member from family
  app.delete('/api/admin/:familyId/members/:userId', async (request, reply) => {
    const { familyId, userId } = request.params as { familyId: string; userId: string };
    const user = (request as any).user;
    const pool = getPool();

    // Check admin role
    const { rows: adminCheck } = await pool.query(
      `SELECT role FROM public.family_members
       WHERE family_id = $1 AND user_id = $2 AND lifecycle_state = 'active'`,
      [familyId, user.sub],
    );

    if (adminCheck.length === 0 || !['OWNER', 'ADMIN'].includes(adminCheck[0].role)) {
      return reply.status(403).send({ error: { message: 'Admin access required', code: 'FORBIDDEN' } });
    }

    // Cannot remove yourself if you're the owner
    if (userId === user.sub && adminCheck[0].role === 'OWNER') {
      return reply.status(400).send({ error: { message: 'Owner cannot remove themselves', code: 'BAD_REQUEST' } });
    }

    await pool.query(
      `UPDATE public.family_members SET lifecycle_state = 'inactive'
       WHERE family_id = $1 AND user_id = $2`,
      [familyId, userId],
    );

    await writeAuditEvent(pool, {
      family_id: familyId,
      event_type: 'member.removed',
      actor_id: user.sub,
      subject_id: userId,
      subject_type: 'user',
    });

    return { data: { removed: true } };
  });
}
