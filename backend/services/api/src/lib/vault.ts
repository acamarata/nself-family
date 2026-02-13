import type { Pool } from 'pg';

type VaultStatus = 'active' | 'sealed' | 'released';
type ReleaseCondition = 'manual' | 'time_trigger' | 'death_verification';
type AfterDeathAction = 'memorialize' | 'delete' | 'transfer';
type MemorialState = 'active' | 'pending_memorial' | 'memorialized';

interface CreateVaultInput {
  family_id: string;
  owner_id: string;
  title: string;
  description?: string;
  release_condition?: ReleaseCondition;
  release_trigger_at?: string;
}

interface AddVaultItemInput {
  vault_id: string;
  content_type: string;
  title?: string;
  content?: string;
  media_id?: string;
  sort_order?: number;
}

interface AddVaultRecipientInput {
  vault_id: string;
  user_id: string;
  message?: string;
}

interface CreateInheritanceScenarioInput {
  family_id: string;
  owner_id: string;
  input_snapshot: Record<string, unknown>;
  output_snapshot: Record<string, unknown>;
}

interface SetSuccessorInput {
  family_id: string;
  owner_id: string;
  successor_id: string;
  after_death_action?: AfterDeathAction;
  notes?: string;
}

interface RequestMemorialInput {
  user_id: string;
  family_id: string;
  requested_by: string;
  memorial_message?: string;
  memorial_date?: string;
}

/**
 * Create a new legacy vault.
 * @param pool - Database pool
 * @param input - Vault data
 * @returns Created vault ID
 */
export async function createVault(pool: Pool, input: CreateVaultInput): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO legacy_vaults (family_id, owner_id, title, description, release_condition, release_trigger_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [input.family_id, input.owner_id, input.title, input.description ?? null,
     input.release_condition ?? 'manual', input.release_trigger_at ?? null],
  );
  return rows[0].id;
}

/**
 * Get all vaults for a user.
 * @param pool - Database pool
 * @param ownerId - Vault owner user ID
 * @returns Array of vaults
 */
export async function getVaults(pool: Pool, ownerId: string) {
  const { rows } = await pool.query(
    `SELECT * FROM legacy_vaults WHERE owner_id = $1 ORDER BY created_at DESC`,
    [ownerId],
  );
  return rows;
}

/**
 * Get a single vault by ID (with items and recipients).
 * @param pool - Database pool
 * @param vaultId - Vault ID
 * @returns Vault with items and recipients
 */
export async function getVaultDetail(pool: Pool, vaultId: string) {
  const { rows: [vault] } = await pool.query(
    `SELECT * FROM legacy_vaults WHERE id = $1`, [vaultId],
  );
  if (!vault) return null;

  const { rows: items } = await pool.query(
    `SELECT * FROM vault_items WHERE vault_id = $1 ORDER BY sort_order`, [vaultId],
  );
  const { rows: recipients } = await pool.query(
    `SELECT vr.*, u.display_name, u.email FROM vault_recipients vr
     JOIN users u ON u.id = vr.user_id WHERE vr.vault_id = $1`, [vaultId],
  );

  return { ...vault, items, recipients };
}

/**
 * Seal a vault (no more edits allowed).
 * @param pool - Database pool
 * @param vaultId - Vault ID
 * @param ownerId - Must match vault owner
 * @returns Success boolean
 */
export async function sealVault(pool: Pool, vaultId: string, ownerId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE legacy_vaults SET status = 'sealed', sealed_at = now()
     WHERE id = $1 AND owner_id = $2 AND status = 'active'`,
    [vaultId, ownerId],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Release a vault (make contents available to recipients).
 * @param pool - Database pool
 * @param vaultId - Vault ID
 * @returns Success boolean
 */
export async function releaseVault(pool: Pool, vaultId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE legacy_vaults SET status = 'released', released_at = now()
     WHERE id = $1 AND status IN ('active', 'sealed')`,
    [vaultId],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Add an item to a vault (only if vault is active).
 * @param pool - Database pool
 * @param input - Item data
 * @returns Created item ID or null if vault not active
 */
export async function addVaultItem(pool: Pool, input: AddVaultItemInput): Promise<string | null> {
  // Check vault is active
  const { rows: [vault] } = await pool.query(
    `SELECT status FROM legacy_vaults WHERE id = $1`, [input.vault_id],
  );
  if (!vault || vault.status !== 'active') return null;

  const { rows } = await pool.query(
    `INSERT INTO vault_items (vault_id, content_type, title, content, media_id, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [input.vault_id, input.content_type, input.title ?? null,
     input.content ?? null, input.media_id ?? null, input.sort_order ?? 0],
  );
  return rows[0].id;
}

/**
 * Remove an item from a vault.
 * @param pool - Database pool
 * @param itemId - Item ID
 * @param vaultId - Vault ID (must be active)
 * @returns Success boolean
 */
export async function removeVaultItem(pool: Pool, itemId: string, vaultId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM vault_items WHERE id = $1 AND vault_id = $2
     AND vault_id IN (SELECT id FROM legacy_vaults WHERE status = 'active')`,
    [itemId, vaultId],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Add a recipient to a vault.
 * @param pool - Database pool
 * @param input - Recipient data
 * @returns Created recipient ID
 */
export async function addVaultRecipient(pool: Pool, input: AddVaultRecipientInput): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO vault_recipients (vault_id, user_id, message)
     VALUES ($1, $2, $3) ON CONFLICT (vault_id, user_id) DO UPDATE SET message = $3 RETURNING id`,
    [input.vault_id, input.user_id, input.message ?? null],
  );
  return rows[0].id;
}

/**
 * Remove a recipient from a vault.
 * @param pool - Database pool
 * @param vaultId - Vault ID
 * @param userId - Recipient user ID
 * @returns Success boolean
 */
export async function removeVaultRecipient(pool: Pool, vaultId: string, userId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM vault_recipients WHERE vault_id = $1 AND user_id = $2`,
    [vaultId, userId],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Get released vaults visible to a user (as recipient).
 * @param pool - Database pool
 * @param userId - Recipient user ID
 * @returns Array of released vaults
 */
export async function getReleasedVaultsForUser(pool: Pool, userId: string) {
  const { rows } = await pool.query(
    `SELECT lv.*, vr.message AS recipient_message, vr.viewed_at
     FROM legacy_vaults lv
     JOIN vault_recipients vr ON vr.vault_id = lv.id AND vr.user_id = $1
     WHERE lv.status = 'released'
     ORDER BY lv.released_at DESC`,
    [userId],
  );
  return rows;
}

/**
 * Mark a released vault as viewed by recipient.
 * @param pool - Database pool
 * @param vaultId - Vault ID
 * @param userId - Recipient user ID
 */
export async function markVaultViewed(pool: Pool, vaultId: string, userId: string): Promise<void> {
  await pool.query(
    `UPDATE vault_recipients SET viewed_at = now() WHERE vault_id = $1 AND user_id = $2`,
    [vaultId, userId],
  );
}

/**
 * Create an immutable inheritance scenario snapshot.
 * @param pool - Database pool
 * @param input - Scenario data
 * @returns Created scenario ID
 */
export async function createInheritanceScenario(pool: Pool, input: CreateInheritanceScenarioInput): Promise<string> {
  // Get next version number
  const { rows: [latest] } = await pool.query(
    `SELECT COALESCE(MAX(version), 0) AS max_version FROM inheritance_scenarios
     WHERE family_id = $1 AND owner_id = $2`,
    [input.family_id, input.owner_id],
  );
  const nextVersion = (latest?.max_version ?? 0) + 1;

  const { rows } = await pool.query(
    `INSERT INTO inheritance_scenarios (family_id, owner_id, version, input_snapshot, output_snapshot)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [input.family_id, input.owner_id, nextVersion,
     JSON.stringify(input.input_snapshot), JSON.stringify(input.output_snapshot)],
  );
  return rows[0].id;
}

/**
 * Get inheritance scenarios for a user (ordered by version).
 * @param pool - Database pool
 * @param familyId - Family ID
 * @param ownerId - Owner ID
 * @returns Array of scenarios
 */
export async function getInheritanceScenarios(pool: Pool, familyId: string, ownerId: string) {
  const { rows } = await pool.query(
    `SELECT * FROM inheritance_scenarios WHERE family_id = $1 AND owner_id = $2 ORDER BY version DESC`,
    [familyId, ownerId],
  );
  return rows;
}

/**
 * Set or update digital successor for a user.
 * @param pool - Database pool
 * @param input - Successor data
 * @returns Successor record ID
 */
export async function setDigitalSuccessor(pool: Pool, input: SetSuccessorInput): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO digital_successors (family_id, owner_id, successor_id, after_death_action, notes)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (family_id, owner_id) DO UPDATE SET
       successor_id = $3, after_death_action = $4, notes = $5, updated_at = now()
     RETURNING id`,
    [input.family_id, input.owner_id, input.successor_id,
     input.after_death_action ?? 'memorialize', input.notes ?? null],
  );
  return rows[0].id;
}

/**
 * Get digital successor for a user.
 * @param pool - Database pool
 * @param familyId - Family ID
 * @param ownerId - Owner ID
 * @returns Successor record or null
 */
export async function getDigitalSuccessor(pool: Pool, familyId: string, ownerId: string) {
  const { rows: [successor] } = await pool.query(
    `SELECT ds.*, u.display_name, u.email FROM digital_successors ds
     JOIN users u ON u.id = ds.successor_id
     WHERE ds.family_id = $1 AND ds.owner_id = $2`,
    [familyId, ownerId],
  );
  return successor ?? null;
}

/**
 * Confirm successor responsibility.
 * @param pool - Database pool
 * @param familyId - Family ID
 * @param ownerId - Account owner
 * @param successorId - Successor confirming
 * @returns Success boolean
 */
export async function confirmSuccessor(pool: Pool, familyId: string, ownerId: string, successorId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE digital_successors SET confirmed_at = now()
     WHERE family_id = $1 AND owner_id = $2 AND successor_id = $3`,
    [familyId, ownerId, successorId],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Request memorialization for a user profile.
 * @param pool - Database pool
 * @param input - Memorial request data
 * @returns Memorial profile ID
 */
export async function requestMemorial(pool: Pool, input: RequestMemorialInput): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO memorial_profiles (user_id, family_id, state, requested_by, memorial_message, memorial_date, requested_at)
     VALUES ($1, $2, 'pending_memorial', $3, $4, $5, now())
     ON CONFLICT (user_id) DO UPDATE SET
       state = 'pending_memorial', requested_by = $3, memorial_message = $4, memorial_date = $5, requested_at = now()
     RETURNING id`,
    [input.user_id, input.family_id, input.requested_by,
     input.memorial_message ?? null, input.memorial_date ?? null],
  );
  return rows[0].id;
}

/**
 * Approve memorialization request (admin only).
 * @param pool - Database pool
 * @param userId - User being memorialized
 * @param approvedBy - Admin approving
 * @returns Success boolean
 */
export async function approveMemorial(pool: Pool, userId: string, approvedBy: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE memorial_profiles SET state = 'memorialized', approved_by = $2, approved_at = now()
     WHERE user_id = $1 AND state = 'pending_memorial'`,
    [userId, approvedBy],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Get memorial profile for a user.
 * @param pool - Database pool
 * @param userId - User ID
 * @returns Memorial profile or null
 */
export async function getMemorialProfile(pool: Pool, userId: string) {
  const { rows: [profile] } = await pool.query(
    `SELECT * FROM memorial_profiles WHERE user_id = $1`, [userId],
  );
  return profile ?? null;
}

/**
 * Check time-triggered vaults that should be released.
 * @param pool - Database pool
 * @returns Number of vaults released
 */
export async function processTimeTriggeredReleases(pool: Pool): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE legacy_vaults SET status = 'released', released_at = now()
     WHERE release_condition = 'time_trigger'
     AND release_trigger_at <= now()
     AND status IN ('active', 'sealed')`,
  );
  return rowCount ?? 0;
}
