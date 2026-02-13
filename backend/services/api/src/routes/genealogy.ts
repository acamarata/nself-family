import type { FastifyInstance } from 'fastify';
import { getPool } from '@nself-family/shared';
import { createGenealogyProfile, getGenealogyProfiles, validateRelationshipGraph, detectDuplicates } from '../lib/genealogy.js';
import { parseGedcom, generateGedcom } from '../lib/gedcom.js';
import { writeAuditEvent } from '../lib/audit.js';

/**
 * Genealogy and GEDCOM routes.
 */
export async function genealogyRoutes(app: FastifyInstance) {
  // Get genealogy profiles for a family
  app.get('/api/genealogy/:familyId/profiles', async (request) => {
    const { familyId } = request.params as { familyId: string };
    const pool = getPool();
    const profiles = await getGenealogyProfiles(pool, familyId);
    return { data: profiles };
  });

  // Create genealogy profile
  app.post('/api/genealogy/:familyId/profiles', async (request) => {
    const { familyId } = request.params as { familyId: string };
    const user = (request as any).user;
    const pool = getPool();
    const body = request.body as Record<string, unknown>;

    const id = await createGenealogyProfile(pool, {
      family_id: familyId,
      ...body,
    } as any);

    await writeAuditEvent(pool, {
      family_id: familyId,
      event_type: 'genealogy.profile_created',
      actor_id: user.sub,
      subject_id: id,
      subject_type: 'genealogy_profile',
    });

    return { data: { id } };
  });

  // Validate relationship graph
  app.get('/api/genealogy/:familyId/validate', async (request) => {
    const { familyId } = request.params as { familyId: string };
    const pool = getPool();
    const conflicts = await validateRelationshipGraph(pool, familyId);
    return { data: { valid: conflicts.length === 0, conflicts } };
  });

  // GEDCOM import
  app.post('/api/genealogy/:familyId/import/gedcom', async (request, reply) => {
    const { familyId } = request.params as { familyId: string };
    const user = (request as any).user;
    const pool = getPool();
    const { content } = request.body as { content: string };

    if (!content) {
      return reply.status(400).send({ error: { message: 'GEDCOM content required', code: 'BAD_REQUEST' } });
    }

    const parsed = parseGedcom(content);
    const imported: string[] = [];
    const duplicates: Array<{ name: string; existingIds: string[] }> = [];

    for (const indi of parsed.individuals) {
      // Check for duplicates
      const dupes = await detectDuplicates(pool, familyId, indi.fullName);
      if (dupes.length > 0) {
        duplicates.push({ name: indi.fullName, existingIds: dupes });
        continue;
      }

      const id = await createGenealogyProfile(pool, {
        family_id: familyId,
        full_name: indi.fullName,
        gender: indi.gender ?? undefined,
        birth_date: indi.birthDate ?? undefined,
        birth_place: indi.birthPlace ?? undefined,
        death_date: indi.deathDate ?? undefined,
        death_place: indi.deathPlace ?? undefined,
        gedcom_id: indi.id,
      });
      imported.push(id);
    }

    await writeAuditEvent(pool, {
      family_id: familyId,
      event_type: 'genealogy.gedcom_imported',
      actor_id: user.sub,
      new_state: { imported_count: imported.length, duplicate_count: duplicates.length },
    });

    return { data: { imported: imported.length, duplicates } };
  });

  // GEDCOM export
  app.get('/api/genealogy/:familyId/export/gedcom', async (request, reply) => {
    const { familyId } = request.params as { familyId: string };
    const pool = getPool();

    const profiles = await getGenealogyProfiles(pool, familyId);
    const { rows: relationships } = await pool.query(
      'SELECT user_a_id, user_b_id, relation_type FROM public.relationships WHERE family_id = $1',
      [familyId],
    );

    const gedcom = generateGedcom(profiles, relationships);

    reply.header('Content-Type', 'text/plain');
    reply.header('Content-Disposition', 'attachment; filename="family.ged"');
    return gedcom;
  });
}
