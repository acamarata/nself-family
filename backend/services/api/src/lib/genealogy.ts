import type { Pool } from 'pg';

interface GenealogyProfile {
  id: string;
  family_id: string;
  user_id: string | null;
  full_name: string;
  maiden_name: string | null;
  birth_date: string | null;
  birth_place: string | null;
  death_date: string | null;
  death_place: string | null;
  gender: string | null;
  generation_number: number | null;
  gedcom_id: string | null;
  biography: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
}

interface CreateGenealogyProfileInput {
  family_id: string;
  user_id?: string;
  full_name: string;
  maiden_name?: string;
  birth_date?: string;
  birth_place?: string;
  death_date?: string;
  death_place?: string;
  gender?: string;
  generation_number?: number;
  gedcom_id?: string;
  biography?: string;
  notes?: string;
}

/**
 * Create a genealogy profile.
 * @param pool - Database pool
 * @param input - Profile data
 * @returns Created profile ID
 */
export async function createGenealogyProfile(pool: Pool, input: CreateGenealogyProfileInput): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO public.genealogy_profiles
      (family_id, user_id, full_name, maiden_name, birth_date, birth_place,
       death_date, death_place, gender, generation_number, gedcom_id, biography, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id`,
    [
      input.family_id, input.user_id ?? null, input.full_name,
      input.maiden_name ?? null, input.birth_date ?? null, input.birth_place ?? null,
      input.death_date ?? null, input.death_place ?? null, input.gender ?? null,
      input.generation_number ?? null, input.gedcom_id ?? null,
      input.biography ?? null, input.notes ?? null,
    ],
  );
  return rows[0].id;
}

/**
 * Get genealogy profiles for a family.
 * @param pool - Database pool
 * @param familyId - Family ID
 * @returns Array of profiles
 */
export async function getGenealogyProfiles(pool: Pool, familyId: string): Promise<GenealogyProfile[]> {
  const { rows } = await pool.query(
    'SELECT * FROM public.genealogy_profiles WHERE family_id = $1 ORDER BY generation_number NULLS LAST, full_name',
    [familyId],
  );
  return rows;
}

/**
 * Validate relationship graph consistency.
 * Checks for contradictions like A is both parent and child of B.
 * @param pool - Database pool
 * @param familyId - Family ID
 * @returns Array of conflict descriptions
 */
export async function validateRelationshipGraph(pool: Pool, familyId: string): Promise<string[]> {
  const conflicts: string[] = [];

  // Check for reciprocal contradictions (A->B parent AND B->A parent)
  const { rows: contradictions } = await pool.query(
    `SELECT r1.user_a_id, r1.user_b_id, r1.relation_type AS type1, r2.relation_type AS type2
     FROM public.relationships r1
     JOIN public.relationships r2
       ON r1.family_id = r2.family_id
       AND r1.user_a_id = r2.user_b_id
       AND r1.user_b_id = r2.user_a_id
     WHERE r1.family_id = $1
       AND r1.relation_type = r2.relation_type
       AND r1.relation_type IN ('parent', 'child')`,
    [familyId],
  );

  for (const c of contradictions) {
    conflicts.push(`Contradictory ${c.type1} relationship between ${c.user_a_id} and ${c.user_b_id}`);
  }

  // Check for self-relationships
  const { rows: selfRels } = await pool.query(
    'SELECT id, user_a_id FROM public.relationships WHERE family_id = $1 AND user_a_id = user_b_id',
    [familyId],
  );

  for (const r of selfRels) {
    conflicts.push(`Self-relationship detected for user ${r.user_a_id}`);
  }

  return conflicts;
}

/**
 * Detect duplicate genealogy profiles by name matching.
 * @param pool - Database pool
 * @param familyId - Family ID
 * @param fullName - Name to check
 * @returns Array of potential duplicate profile IDs
 */
export async function detectDuplicates(pool: Pool, familyId: string, fullName: string): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT id FROM public.genealogy_profiles
     WHERE family_id = $1 AND LOWER(full_name) = LOWER($2)`,
    [familyId, fullName],
  );
  return rows.map((r) => r.id);
}
