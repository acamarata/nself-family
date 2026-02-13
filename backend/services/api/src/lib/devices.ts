import type { Pool } from 'pg';
import { randomBytes } from 'crypto';

interface RegisterDeviceInput {
  family_id: string;
  user_id: string;
  device_name: string;
  device_type: string;
  public_key?: string;
}

interface PairingCodeResult {
  code: string;
  expires_at: string;
}

/**
 * Register a new device (enrollment step 1).
 * @param pool - Database pool
 * @param input - Device registration data
 * @returns Device ID and bootstrap token
 */
export async function registerDevice(pool: Pool, input: RegisterDeviceInput): Promise<{ id: string; bootstrap_token: string }> {
  const bootstrapToken = randomBytes(32).toString('hex');
  const { rows: [device] } = await pool.query(
    `INSERT INTO registered_devices (family_id, user_id, device_name, device_type, public_key, bootstrap_token)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [input.family_id, input.user_id, input.device_name, input.device_type,
     input.public_key ?? null, bootstrapToken],
  );
  return { id: device.id, bootstrap_token: bootstrapToken };
}

/**
 * Validate a device bootstrap token and issue credential (enrollment step 2).
 * @param pool - Database pool
 * @param deviceId - Device ID
 * @param bootstrapToken - Token from step 1
 * @returns Device credential or null if invalid
 */
export async function validateAndIssueCredential(pool: Pool, deviceId: string, bootstrapToken: string): Promise<string | null> {
  const { rows: [device] } = await pool.query(
    `SELECT id, bootstrap_token FROM registered_devices WHERE id = $1 AND is_revoked = false`,
    [deviceId],
  );
  if (!device || device.bootstrap_token !== bootstrapToken) return null;

  const credential = randomBytes(48).toString('hex');
  await pool.query(
    `UPDATE registered_devices SET credential = $1, is_trusted = true, bootstrap_token = NULL WHERE id = $2`,
    [credential, deviceId],
  );
  return credential;
}

/**
 * Update device heartbeat and health metrics.
 * @param pool - Database pool
 * @param deviceId - Device ID
 * @param healthMetrics - Health data from device
 * @returns True if device exists and is trusted
 */
export async function deviceHeartbeat(pool: Pool, deviceId: string, healthMetrics?: Record<string, unknown>): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE registered_devices SET last_heartbeat_at = now(), health_metrics = COALESCE($2, health_metrics)
     WHERE id = $1 AND is_trusted = true AND is_revoked = false`,
    [deviceId, healthMetrics ? JSON.stringify(healthMetrics) : null],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Revoke a device.
 * @param pool - Database pool
 * @param deviceId - Device ID
 * @returns True if device revoked
 */
export async function revokeDevice(pool: Pool, deviceId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE registered_devices SET is_revoked = true, credential = NULL WHERE id = $1`,
    [deviceId],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Get all devices for a family.
 * @param pool - Database pool
 * @param familyId - Family ID
 * @returns Array of devices
 */
export async function getFamilyDevices(pool: Pool, familyId: string) {
  const { rows } = await pool.query(
    `SELECT id, family_id, user_id, device_name, device_type, is_trusted, is_revoked,
     last_heartbeat_at, health_metrics, created_at, updated_at
     FROM registered_devices WHERE family_id = $1 ORDER BY created_at DESC`,
    [familyId],
  );
  return rows;
}

/**
 * Create a short-lived pairing code for TV device.
 * @param pool - Database pool
 * @param deviceId - TV device ID
 * @param ttlMinutes - Code validity in minutes
 * @returns Pairing code and expiry
 */
export async function createPairingCode(pool: Pool, deviceId: string, ttlMinutes = 5): Promise<PairingCodeResult> {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  await pool.query(
    `INSERT INTO device_pairing_codes (code, device_id, expires_at) VALUES ($1, $2, $3)`,
    [code, deviceId, expiresAt],
  );
  return { code, expires_at: expiresAt };
}

/**
 * Confirm a pairing code — user enters code to pair TV device.
 * @param pool - Database pool
 * @param code - Pairing code
 * @param userId - User confirming
 * @returns Session token or null if invalid/expired
 */
export async function confirmPairingCode(pool: Pool, code: string, userId: string): Promise<string | null> {
  const sessionToken = randomBytes(32).toString('hex');
  const { rowCount } = await pool.query(
    `UPDATE device_pairing_codes SET user_id = $1, confirmed_at = now(), session_token = $2
     WHERE code = $3 AND confirmed_at IS NULL AND expires_at > now()`,
    [userId, sessionToken, code],
  );
  if ((rowCount ?? 0) === 0) return null;
  return sessionToken;
}

/**
 * Get device count per family.
 * @param pool - Database pool
 * @param familyId - Family ID
 * @returns Total and active device counts
 */
export async function getDeviceCount(pool: Pool, familyId: string): Promise<{ total: number; active: number }> {
  const { rows: [counts] } = await pool.query(
    `SELECT COUNT(*)::int AS total,
     COUNT(*) FILTER (WHERE is_trusted AND NOT is_revoked)::int AS active
     FROM registered_devices WHERE family_id = $1`,
    [familyId],
  );
  return { total: counts.total, active: counts.active };
}
