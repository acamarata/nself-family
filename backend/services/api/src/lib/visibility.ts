import type { Pool } from 'pg';

interface VisibilityContext {
  viewerId: string;
  viewerRole: string;
  familyId: string;
}

interface VisibilityResult {
  allowed: boolean;
  reason: string;
}

/**
 * Evaluate whether a viewer can see a post based on visibility settings.
 * Server-authoritative — Hasura row-level security mirrors this logic.
 * @param pool - Database pool
 * @param postId - The post to check
 * @param ctx - Viewer context
 * @returns Visibility evaluation result
 */
export async function evaluatePostVisibility(
  pool: Pool,
  postId: string,
  ctx: VisibilityContext,
): Promise<VisibilityResult> {
  // Fetch post visibility + family settings
  const { rows } = await pool.query(
    `SELECT p.visibility, p.author_id, p.family_id,
            fs.islamic_mode_enabled,
            fm.role as viewer_role,
            fm.lifecycle_state as viewer_state
     FROM public.posts p
     LEFT JOIN public.family_settings fs ON fs.family_id = p.family_id
     LEFT JOIN public.family_members fm ON fm.family_id = p.family_id AND fm.user_id = $2
     WHERE p.id = $1 AND p.is_deleted = false`,
    [postId, ctx.viewerId],
  );

  if (rows.length === 0) {
    return { allowed: false, reason: 'post_not_found' };
  }

  const post = rows[0];

  // Not a member of this family
  if (!post.viewer_role || post.viewer_state !== 'active') {
    return { allowed: false, reason: 'not_family_member' };
  }

  // Author can always see their own posts
  if (post.author_id === ctx.viewerId) {
    return { allowed: true, reason: 'author' };
  }

  // Visibility checks
  switch (post.visibility) {
    case 'public':
    case 'family':
      break; // All family members can see

    case 'adults_only':
      if (['YOUTH_MEMBER', 'CHILD_MEMBER'].includes(post.viewer_role)) {
        return { allowed: false, reason: 'adults_only_content' };
      }
      break;

    case 'private':
      // Check explicit audience list
      const { rows: audience } = await pool.query(
        'SELECT 1 FROM public.post_audiences WHERE post_id = $1 AND user_id = $2',
        [postId, ctx.viewerId],
      );
      if (audience.length === 0) {
        return { allowed: false, reason: 'not_in_audience' };
      }
      break;
  }

  // Islamic mode mahram filtering
  if (post.islamic_mode_enabled) {
    const mahramResult = await evaluateMahramVisibility(pool, postId, ctx);
    if (!mahramResult.allowed) return mahramResult;
  }

  // Parental controls
  if (['YOUTH_MEMBER', 'CHILD_MEMBER'].includes(post.viewer_role)) {
    const parentalResult = await evaluateParentalControls(pool, ctx);
    if (!parentalResult.allowed) return parentalResult;
  }

  return { allowed: true, reason: 'policy_passed' };
}

/**
 * Evaluate mahram-aware visibility when Islamic mode is enabled.
 * Conservative deny on ambiguous relationship data.
 * @param pool - Database pool
 * @param postId - The post to check
 * @param ctx - Viewer context
 * @returns Visibility result
 */
async function evaluateMahramVisibility(
  pool: Pool,
  postId: string,
  ctx: VisibilityContext,
): Promise<VisibilityResult> {
  const { rows: post } = await pool.query(
    'SELECT author_id FROM public.posts WHERE id = $1',
    [postId],
  );
  if (post.length === 0) return { allowed: false, reason: 'post_not_found' };

  const authorId = post[0].author_id;
  if (authorId === ctx.viewerId) return { allowed: true, reason: 'author' };

  // Check mahram relationship between viewer and author
  const { rows: rels } = await pool.query(
    `SELECT is_mahram FROM public.relationships
     WHERE family_id = $1
       AND ((user_a_id = $2 AND user_b_id = $3) OR (user_a_id = $3 AND user_b_id = $2))`,
    [ctx.familyId, ctx.viewerId, authorId],
  );

  // No relationship found — conservative deny
  if (rels.length === 0) {
    return { allowed: false, reason: 'no_mahram_relationship' };
  }

  // Relationship exists but not mahram — deny for adults_only content
  if (!rels[0].is_mahram) {
    const { rows: postVis } = await pool.query(
      'SELECT visibility FROM public.posts WHERE id = $1',
      [postId],
    );
    if (postVis[0]?.visibility === 'adults_only') {
      return { allowed: false, reason: 'not_mahram_for_adults_content' };
    }
  }

  return { allowed: true, reason: 'mahram_check_passed' };
}

/**
 * Evaluate parental controls for child/youth members.
 * @param pool - Database pool
 * @param ctx - Viewer context
 * @returns Visibility result
 */
async function evaluateParentalControls(
  pool: Pool,
  ctx: VisibilityContext,
): Promise<VisibilityResult> {
  const { rows } = await pool.query(
    `SELECT can_view_adults_only FROM public.parental_controls
     WHERE family_id = $1 AND child_user_id = $2`,
    [ctx.familyId, ctx.viewerId],
  );

  // No parental controls set — allow (parents haven't configured restrictions)
  if (rows.length === 0) {
    return { allowed: true, reason: 'no_parental_controls' };
  }

  return { allowed: true, reason: 'parental_controls_passed' };
}

/**
 * Get the family settings for a family.
 * @param pool - Database pool
 * @param familyId - Family ID
 * @returns Family settings or null
 */
export async function getFamilySettings(pool: Pool, familyId: string) {
  const { rows } = await pool.query(
    'SELECT * FROM public.family_settings WHERE family_id = $1',
    [familyId],
  );
  return rows[0] ?? null;
}

/**
 * Update family settings (OWNER/ADMIN only — enforced by caller).
 * @param pool - Database pool
 * @param familyId - Family ID
 * @param updates - Settings to update
 * @param updatedBy - User making the change
 */
export async function updateFamilySettings(
  pool: Pool,
  familyId: string,
  updates: Record<string, unknown>,
  updatedBy: string,
) {
  const existing = await getFamilySettings(pool, familyId);
  if (existing) {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (['islamic_mode_enabled', 'default_visibility', 'parental_controls_enabled', 'content_moderation_level', 'settings'].includes(key)) {
        setClauses.push(`${key} = $${paramIdx}`);
        params.push(value);
        paramIdx++;
      }
    }

    if (setClauses.length > 0) {
      setClauses.push(`updated_by = $${paramIdx}`);
      params.push(updatedBy);
      paramIdx++;
      params.push(familyId);
      await pool.query(
        `UPDATE public.family_settings SET ${setClauses.join(', ')} WHERE family_id = $${paramIdx}`,
        params,
      );
    }
  } else {
    await pool.query(
      `INSERT INTO public.family_settings (family_id, islamic_mode_enabled, default_visibility, parental_controls_enabled, updated_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        familyId,
        updates.islamic_mode_enabled ?? false,
        updates.default_visibility ?? 'family',
        updates.parental_controls_enabled ?? false,
        updatedBy,
      ],
    );
  }
}
