import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import type { Pool } from '@nself-family/shared';

/**
 * Hash a refresh token for storage. Never store raw refresh tokens.
 * @param token - Raw refresh token string
 * @returns SHA-256 hash of the token
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Store a refresh token in the database.
 * @param pool - Database pool
 * @param userId - User UUID
 * @param tokenHash - SHA-256 hash of refresh token
 * @param sessionId - Session UUID
 * @param familyChain - Token family ID for rotation detection
 * @param expiresInSeconds - Token lifetime in seconds
 * @returns Created token record ID
 */
export async function storeRefreshToken(
  pool: Pool,
  userId: string,
  tokenHash: string,
  sessionId: string,
  familyChain: string,
  expiresInSeconds: number,
): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO auth.refresh_tokens (user_id, token_hash, session_id, family_chain, expires_at)
     VALUES ($1, $2, $3, $4, now() + interval '1 second' * $5)
     RETURNING id`,
    [userId, tokenHash, sessionId, familyChain, expiresInSeconds],
  );
  return result.rows[0].id;
}

/**
 * Find a valid (non-expired, non-revoked) refresh token by its hash.
 * @param pool - Database pool
 * @param tokenHash - SHA-256 hash of refresh token
 * @returns Token record or null
 */
export async function findRefreshToken(
  pool: Pool,
  tokenHash: string,
): Promise<{ id: string; user_id: string; session_id: string; family_chain: string } | null> {
  const result = await pool.query<{ id: string; user_id: string; session_id: string; family_chain: string }>(
    `SELECT id, user_id, session_id, family_chain FROM auth.refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [tokenHash],
  );
  return result.rows[0] ?? null;
}

/**
 * Revoke a specific refresh token.
 * @param pool - Database pool
 * @param tokenId - Token record ID
 */
export async function revokeRefreshToken(pool: Pool, tokenId: string): Promise<void> {
  await pool.query(
    'UPDATE auth.refresh_tokens SET revoked_at = now() WHERE id = $1',
    [tokenId],
  );
}

/**
 * Revoke all refresh tokens in a token family (suspicious reuse detection).
 * @param pool - Database pool
 * @param familyChain - Token family ID
 */
export async function revokeTokenFamily(pool: Pool, familyChain: string): Promise<void> {
  await pool.query(
    'UPDATE auth.refresh_tokens SET revoked_at = now() WHERE family_chain = $1 AND revoked_at IS NULL',
    [familyChain],
  );
}

/**
 * Revoke all refresh tokens for a user (logout everywhere).
 * @param pool - Database pool
 * @param userId - User UUID
 */
export async function revokeAllUserTokens(pool: Pool, userId: string): Promise<void> {
  await pool.query(
    'UPDATE auth.refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId],
  );
}

/**
 * Create a new session record.
 * @param pool - Database pool
 * @param userId - User UUID
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent string
 * @returns Session UUID
 */
export async function createSession(
  pool: Pool,
  userId: string,
  ipAddress: string | null,
  userAgent: string | null,
): Promise<string> {
  const sessionId = randomUUID();
  await pool.query(
    `INSERT INTO auth.sessions (id, user_id, ip_address, user_agent)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, userId, ipAddress, userAgent],
  );
  return sessionId;
}

/**
 * Deactivate a session.
 * @param pool - Database pool
 * @param sessionId - Session UUID
 */
export async function deactivateSession(pool: Pool, sessionId: string): Promise<void> {
  await pool.query(
    'UPDATE auth.sessions SET is_active = false WHERE id = $1',
    [sessionId],
  );
}

/**
 * Deactivate all sessions for a user.
 * @param pool - Database pool
 * @param userId - User UUID
 */
export async function deactivateAllSessions(pool: Pool, userId: string): Promise<void> {
  await pool.query(
    'UPDATE auth.sessions SET is_active = false WHERE user_id = $1 AND is_active = true',
    [userId],
  );
}
