import type { Pool } from 'pg';
import { randomBytes, createHmac } from 'crypto';

interface AdmitInput {
  user_id: string;
  family_id: string;
  device_id?: string;
  content_id: string;
  max_concurrent_per_user?: number;
  max_concurrent_per_family?: number;
}

interface AdmitResult {
  admitted: boolean;
  session_id?: string;
  session_token?: string;
  playback_url?: string;
  denial_reason?: string;
}

const HEARTBEAT_TIMEOUT_MS = 45_000;

/**
 * Generate a signed playback URL.
 * @param contentId - Content identifier
 * @param sessionToken - Session token for verification
 * @returns Signed playback URL
 */
function generatePlaybackUrl(contentId: string, sessionToken: string): string {
  const sig = createHmac('sha256', sessionToken).update(contentId).digest('hex').slice(0, 16);
  return `/stream/${contentId}?token=${sessionToken}&sig=${sig}`;
}

/**
 * Admit a user to a stream session with concurrency checks.
 * @param pool - Database pool
 * @param input - Admission request
 * @returns Admission result with session details or denial reason
 */
export async function admitStream(pool: Pool, input: AdmitInput): Promise<AdmitResult> {
  const maxUser = input.max_concurrent_per_user ?? 3;
  const maxFamily = input.max_concurrent_per_family ?? 10;

  // Count active sessions for user
  const { rows: [userCount] } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM stream_sessions WHERE user_id = $1 AND ended_at IS NULL`,
    [input.user_id],
  );
  if (userCount.count >= maxUser) {
    return { admitted: false, denial_reason: `Maximum ${maxUser} concurrent streams per user reached` };
  }

  // Count active sessions for family
  const { rows: [familyCount] } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM stream_sessions WHERE family_id = $1 AND ended_at IS NULL`,
    [input.family_id],
  );
  if (familyCount.count >= maxFamily) {
    return { admitted: false, denial_reason: `Maximum ${maxFamily} concurrent streams per family reached` };
  }

  // Create session
  const sessionToken = randomBytes(32).toString('hex');
  const playbackUrl = generatePlaybackUrl(input.content_id, sessionToken);

  const { rows: [session] } = await pool.query(
    `INSERT INTO stream_sessions (user_id, family_id, device_id, content_id, playback_url, session_token)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [input.user_id, input.family_id, input.device_id ?? null, input.content_id, playbackUrl, sessionToken],
  );

  return {
    admitted: true,
    session_id: session.id,
    session_token: sessionToken,
    playback_url: playbackUrl,
  };
}

/**
 * Update heartbeat for a stream session.
 * @param pool - Database pool
 * @param sessionToken - Session token
 * @returns True if session still active
 */
export async function heartbeat(pool: Pool, sessionToken: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE stream_sessions SET last_heartbeat_at = now() WHERE session_token = $1 AND ended_at IS NULL`,
    [sessionToken],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * End a stream session.
 * @param pool - Database pool
 * @param sessionToken - Session token
 * @returns True if session ended
 */
export async function endSession(pool: Pool, sessionToken: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE stream_sessions SET ended_at = now() WHERE session_token = $1 AND ended_at IS NULL`,
    [sessionToken],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Evict timed-out sessions (no heartbeat within timeout window).
 * @param pool - Database pool
 * @param timeoutMs - Heartbeat timeout in milliseconds
 * @returns Number of sessions evicted
 */
export async function evictTimedOut(pool: Pool, timeoutMs = HEARTBEAT_TIMEOUT_MS): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE stream_sessions SET ended_at = now(), evicted = true
     WHERE ended_at IS NULL AND last_heartbeat_at < now() - interval '1 millisecond' * $1`,
    [timeoutMs],
  );
  return rowCount ?? 0;
}

/**
 * Get active sessions for a user.
 * @param pool - Database pool
 * @param userId - User ID
 * @returns Array of active sessions
 */
export async function getActiveSessions(pool: Pool, userId: string) {
  const { rows } = await pool.query(
    `SELECT * FROM stream_sessions WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC`,
    [userId],
  );
  return rows;
}
