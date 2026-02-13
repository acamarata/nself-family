import type { Pool } from 'pg';

interface IndexContentInput {
  family_id: string;
  content_type: string;
  content_id: string;
  title?: string;
  body?: string;
  author_id?: string;
  visibility?: string;
  metadata?: Record<string, unknown>;
}

interface SearchInput {
  family_id: string;
  query: string;
  content_types?: string[];
  author_id?: string;
  limit?: number;
  offset?: number;
}

interface SearchResult {
  id: string;
  family_id: string;
  content_type: string;
  content_id: string;
  title: string | null;
  body: string | null;
  author_id: string | null;
  visibility: string;
  metadata: Record<string, unknown>;
  rank: number;
  headline: string;
  created_at: string;
}

interface ActivityLogInput {
  family_id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Index or update content in the search index.
 * @param pool - Database pool
 * @param input - Content to index
 * @returns Indexed entry ID
 */
export async function indexContent(pool: Pool, input: IndexContentInput): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO search_index (family_id, content_type, content_id, title, body, author_id, visibility, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (content_type, content_id) DO UPDATE SET
       title = $4, body = $5, author_id = $6, visibility = $7, metadata = $8, updated_at = now()
     RETURNING id`,
    [input.family_id, input.content_type, input.content_id,
     input.title ?? null, input.body ?? null, input.author_id ?? null,
     input.visibility ?? 'family', JSON.stringify(input.metadata ?? {})],
  );
  return rows[0].id;
}

/**
 * Remove content from search index.
 * @param pool - Database pool
 * @param contentType - Type of content
 * @param contentId - Content ID
 * @returns Success boolean
 */
export async function removeFromIndex(pool: Pool, contentType: string, contentId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM search_index WHERE content_type = $1 AND content_id = $2`,
    [contentType, contentId],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Search across all indexed content with full-text search.
 * @param pool - Database pool
 * @param input - Search parameters
 * @returns Search results with ranking and headline
 */
export async function search(pool: Pool, input: SearchInput): Promise<SearchResult[]> {
  const tsQuery = input.query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .join(' & ');

  if (!tsQuery) return [];

  const params: unknown[] = [input.family_id, tsQuery];
  let paramIndex = 3;
  const conditions: string[] = ['si.family_id = $1', 'si.search_vector @@ to_tsquery(\'english\', $2)'];

  if (input.content_types && input.content_types.length > 0) {
    conditions.push(`si.content_type = ANY($${paramIndex})`);
    params.push(input.content_types);
    paramIndex++;
  }

  if (input.author_id) {
    conditions.push(`si.author_id = $${paramIndex}`);
    params.push(input.author_id);
    paramIndex++;
  }

  const limit = input.limit ?? 20;
  const offset = input.offset ?? 0;
  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT si.*,
       ts_rank(si.search_vector, to_tsquery('english', $2)) AS rank,
       ts_headline('english', COALESCE(si.title, '') || ' ' || COALESCE(si.body, ''),
         to_tsquery('english', $2), 'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MaxWords=30') AS headline
     FROM search_index si
     WHERE ${conditions.join(' AND ')}
     ORDER BY rank DESC, si.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params,
  );
  return rows;
}

/**
 * Get total count for a search query (for pagination).
 * @param pool - Database pool
 * @param familyId - Family ID
 * @param query - Search query
 * @param contentTypes - Optional content type filter
 * @returns Total count
 */
export async function searchCount(pool: Pool, familyId: string, query: string, contentTypes?: string[]): Promise<number> {
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .join(' & ');

  if (!tsQuery) return 0;

  const params: unknown[] = [familyId, tsQuery];
  const conditions: string[] = ['family_id = $1', "search_vector @@ to_tsquery('english', $2)"];

  if (contentTypes && contentTypes.length > 0) {
    conditions.push('content_type = ANY($3)');
    params.push(contentTypes);
  }

  const { rows: [{ count }] } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM search_index WHERE ${conditions.join(' AND ')}`,
    params,
  );
  return count;
}

/**
 * Log an activity event.
 * @param pool - Database pool
 * @param input - Activity data
 * @returns Activity log ID
 */
export async function logActivity(pool: Pool, input: ActivityLogInput): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO activity_log (family_id, actor_id, action, target_type, target_id, summary, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [input.family_id, input.actor_id, input.action, input.target_type,
     input.target_id, input.summary ?? null, JSON.stringify(input.metadata ?? {})],
  );
  return rows[0].id;
}

/**
 * Get recent activity for a family (admin feed).
 * @param pool - Database pool
 * @param familyId - Family ID
 * @param limit - Max results
 * @param offset - Offset for pagination
 * @returns Array of activity log entries
 */
export async function getActivityFeed(pool: Pool, familyId: string, limit = 50, offset = 0) {
  const { rows } = await pool.query(
    `SELECT al.*, u.display_name AS actor_name, u.avatar_url AS actor_avatar
     FROM activity_log al
     JOIN users u ON u.id = al.actor_id
     WHERE al.family_id = $1
     ORDER BY al.created_at DESC
     LIMIT $2 OFFSET $3`,
    [familyId, limit, offset],
  );
  return rows;
}

/**
 * Bulk index content for initial population.
 * @param pool - Database pool
 * @param items - Array of content to index
 * @returns Number of items indexed
 */
export async function bulkIndex(pool: Pool, items: IndexContentInput[]): Promise<number> {
  if (items.length === 0) return 0;
  let count = 0;
  for (const item of items) {
    await indexContent(pool, item);
    count++;
  }
  return count;
}

/**
 * Get content type facet counts for a search.
 * @param pool - Database pool
 * @param familyId - Family ID
 * @param query - Search query
 * @returns Facet counts by content type
 */
export async function getSearchFacets(pool: Pool, familyId: string, query: string): Promise<Record<string, number>> {
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .join(' & ');

  if (!tsQuery) return {};

  const { rows } = await pool.query(
    `SELECT content_type, COUNT(*)::int AS count
     FROM search_index
     WHERE family_id = $1 AND search_vector @@ to_tsquery('english', $2)
     GROUP BY content_type ORDER BY count DESC`,
    [familyId, tsQuery],
  );

  const facets: Record<string, number> = {};
  for (const row of rows) {
    facets[row.content_type] = row.count;
  }
  return facets;
}
