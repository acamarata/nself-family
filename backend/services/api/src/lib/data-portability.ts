import type { Pool, PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';

/**
 * Structured export of all family data for portability (GDPR, migration, backup).
 */
export interface FamilyExportData {
  version: '1.0';
  exported_at: string;
  family: Record<string, unknown>;
  members: Array<Record<string, unknown>>;
  posts: Array<Record<string, unknown>>;
  media_items: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  recipes: Array<Record<string, unknown>>;
  conversations: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
  vaults: Array<Record<string, unknown>>;
  vault_items: Array<Record<string, unknown>>;
  relationships: Array<Record<string, unknown>>;
  audit_events: Array<Record<string, unknown>>;
}

/**
 * Summary returned after importing family data.
 */
export interface ImportSummary {
  family_id: string;
  counts: Record<string, number>;
  id_mapping: Record<string, string>;
}

/**
 * Summary returned after deleting all family data.
 */
export interface DeletionSummary {
  family_id: string;
  counts: Record<string, number>;
  completed_at: string;
}

/**
 * Result of a data integrity verification check.
 */
export interface IntegrityReport {
  family_id: string;
  valid: boolean;
  issues: string[];
  checked_at: string;
}

/**
 * Count summary of all data types for a family.
 */
export interface DataSummary {
  members: number;
  posts: number;
  media: number;
  events: number;
  recipes: number;
  conversations: number;
  messages: number;
  vaults: number;
}

/**
 * Generate a new UUID, remapping from an old ID. Stores the mapping for later reference.
 * @param oldId - Original UUID
 * @param mapping - ID mapping object (mutated)
 * @returns New UUID
 */
function remapId(oldId: string, mapping: Record<string, string>): string {
  if (mapping[oldId]) {
    return mapping[oldId];
  }
  const newId = randomUUID();
  mapping[oldId] = newId;
  return newId;
}

/**
 * Export all data associated with a family as a structured JSON object.
 * Includes: family info, members, posts, media items, events, recipes,
 * conversations, messages, vaults, vault items, relationships, and audit trail.
 * @param pool - Database pool
 * @param familyId - Family UUID to export
 * @returns Complete family export data
 */
export async function exportFamilyData(pool: Pool, familyId: string): Promise<FamilyExportData> {
  const { rows: [family] } = await pool.query(
    `SELECT * FROM public.families WHERE id = $1`,
    [familyId],
  );

  if (!family) {
    throw new Error(`Family not found: ${familyId}`);
  }

  const { rows: members } = await pool.query(
    `SELECT u.*, fm.role, fm.joined_at
     FROM public.family_members fm
     JOIN public.users u ON u.id = fm.user_id
     WHERE fm.family_id = $1`,
    [familyId],
  );

  const { rows: posts } = await pool.query(
    `SELECT * FROM public.posts WHERE family_id = $1 ORDER BY created_at`,
    [familyId],
  );

  const { rows: mediaItems } = await pool.query(
    `SELECT mi.*, json_agg(mv.*) FILTER (WHERE mv.id IS NOT NULL) AS variants
     FROM public.media_items mi
     LEFT JOIN public.media_variants mv ON mv.media_item_id = mi.id
     WHERE mi.family_id = $1
     GROUP BY mi.id
     ORDER BY mi.created_at`,
    [familyId],
  );

  const { rows: events } = await pool.query(
    `SELECT * FROM public.events WHERE family_id = $1 ORDER BY created_at`,
    [familyId],
  );

  const { rows: recipes } = await pool.query(
    `SELECT * FROM public.recipes WHERE family_id = $1 ORDER BY created_at`,
    [familyId],
  );

  const { rows: conversations } = await pool.query(
    `SELECT * FROM public.conversations WHERE family_id = $1 ORDER BY created_at`,
    [familyId],
  );

  const conversationIds = conversations.map((c: Record<string, unknown>) => c.id);
  let messages: Array<Record<string, unknown>> = [];
  if (conversationIds.length > 0) {
    const { rows } = await pool.query(
      `SELECT * FROM public.messages WHERE conversation_id = ANY($1) ORDER BY created_at`,
      [conversationIds],
    );
    messages = rows;
  }

  const { rows: vaults } = await pool.query(
    `SELECT * FROM public.legacy_vaults WHERE family_id = $1 ORDER BY created_at`,
    [familyId],
  );

  const vaultIds = vaults.map((v: Record<string, unknown>) => v.id);
  let vaultItems: Array<Record<string, unknown>> = [];
  if (vaultIds.length > 0) {
    const { rows } = await pool.query(
      `SELECT * FROM public.vault_items WHERE vault_id = ANY($1) ORDER BY sort_order`,
      [vaultIds],
    );
    vaultItems = rows;
  }

  const { rows: relationships } = await pool.query(
    `SELECT * FROM public.relationships WHERE family_id = $1`,
    [familyId],
  );

  const { rows: auditEvents } = await pool.query(
    `SELECT * FROM public.audit_events WHERE family_id = $1 ORDER BY created_at`,
    [familyId],
  );

  return {
    version: '1.0',
    exported_at: new Date().toISOString(),
    family,
    members,
    posts,
    media_items: mediaItems,
    events,
    recipes,
    conversations,
    messages,
    vaults,
    vault_items: vaultItems,
    relationships,
    audit_events: auditEvents,
  };
}

/**
 * Import family data from an export format into the database.
 * Generates new UUIDs for all records while preserving internal relationships.
 * Optionally imports into an existing family or creates a new one.
 * @param pool - Database pool
 * @param data - Previously exported family data
 * @param targetFamilyId - Optional: import into existing family instead of creating new one
 * @returns Import summary with counts and ID mapping
 */
export async function importFamilyData(
  pool: Pool,
  data: FamilyExportData,
  targetFamilyId?: string,
): Promise<ImportSummary> {
  const client = await pool.connect();
  const idMapping: Record<string, string> = {};
  const counts: Record<string, number> = {};

  try {
    await client.query('BEGIN');

    // Resolve family ID
    let familyId: string;
    if (targetFamilyId) {
      familyId = targetFamilyId;
      idMapping[data.family.id as string] = targetFamilyId;
    } else {
      const oldFamilyId = data.family.id as string;
      familyId = remapId(oldFamilyId, idMapping);
      await client.query(
        `INSERT INTO public.families (id, name, created_at)
         VALUES ($1, $2, $3)`,
        [familyId, data.family.name, data.family.created_at ?? new Date().toISOString()],
      );
      counts.families = 1;
    }

    // Import members (users + family_members)
    counts.members = 0;
    for (const member of data.members) {
      const oldUserId = member.id as string;
      const newUserId = remapId(oldUserId, idMapping);
      await client.query(
        `INSERT INTO public.users (id, email, display_name, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [newUserId, member.email, member.display_name, member.created_at ?? new Date().toISOString()],
      );
      await client.query(
        `INSERT INTO public.family_members (family_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, $4)`,
        [familyId, newUserId, member.role ?? 'member', member.joined_at ?? new Date().toISOString()],
      );
      counts.members++;
    }

    // Import posts
    counts.posts = 0;
    for (const post of data.posts) {
      const oldPostId = post.id as string;
      const newPostId = remapId(oldPostId, idMapping);
      const authorId = idMapping[post.author_id as string] ?? post.author_id;
      await client.query(
        `INSERT INTO public.posts (id, family_id, author_id, content, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [newPostId, familyId, authorId, post.content, post.created_at ?? new Date().toISOString()],
      );
      counts.posts++;
    }

    // Import media items
    counts.media_items = 0;
    for (const media of data.media_items) {
      const oldMediaId = media.id as string;
      const newMediaId = remapId(oldMediaId, idMapping);
      const uploadedBy = idMapping[media.uploaded_by as string] ?? media.uploaded_by;
      await client.query(
        `INSERT INTO public.media_items (id, family_id, uploaded_by, file_name, mime_type, file_size, storage_path, checksum_sha256, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [newMediaId, familyId, uploadedBy, media.file_name, media.mime_type,
         media.file_size, media.storage_path, media.checksum_sha256,
         media.created_at ?? new Date().toISOString()],
      );
      counts.media_items++;
    }

    // Import events
    counts.events = 0;
    for (const event of data.events) {
      const oldEventId = event.id as string;
      const newEventId = remapId(oldEventId, idMapping);
      const createdBy = idMapping[event.created_by as string] ?? event.created_by;
      await client.query(
        `INSERT INTO public.events (id, family_id, title, description, start_time, end_time, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [newEventId, familyId, event.title, event.description ?? null,
         event.start_time, event.end_time ?? null, createdBy,
         event.created_at ?? new Date().toISOString()],
      );
      counts.events++;
    }

    // Import recipes
    counts.recipes = 0;
    for (const recipe of data.recipes) {
      const oldRecipeId = recipe.id as string;
      const newRecipeId = remapId(oldRecipeId, idMapping);
      const createdBy = idMapping[recipe.created_by as string] ?? recipe.created_by;
      await client.query(
        `INSERT INTO public.recipes (id, family_id, title, description, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newRecipeId, familyId, recipe.title, recipe.description ?? null,
         createdBy, recipe.created_at ?? new Date().toISOString()],
      );
      counts.recipes++;
    }

    // Import conversations
    counts.conversations = 0;
    for (const conversation of data.conversations) {
      const oldConvId = conversation.id as string;
      const newConvId = remapId(oldConvId, idMapping);
      const createdBy = idMapping[conversation.created_by as string] ?? conversation.created_by;
      await client.query(
        `INSERT INTO public.conversations (id, family_id, type, title, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newConvId, familyId, conversation.type, conversation.title ?? null,
         createdBy, conversation.created_at ?? new Date().toISOString()],
      );
      counts.conversations++;
    }

    // Import messages
    counts.messages = 0;
    for (const message of data.messages) {
      const oldMsgId = message.id as string;
      const newMsgId = remapId(oldMsgId, idMapping);
      const conversationId = idMapping[message.conversation_id as string] ?? message.conversation_id;
      const senderId = idMapping[message.sender_id as string] ?? message.sender_id;
      const replyToId = message.reply_to_id
        ? (idMapping[message.reply_to_id as string] ?? message.reply_to_id)
        : null;
      await client.query(
        `INSERT INTO public.messages (id, conversation_id, sender_id, content, message_type, reply_to_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newMsgId, conversationId, senderId, message.content,
         message.message_type ?? 'text', replyToId,
         message.created_at ?? new Date().toISOString()],
      );
      counts.messages++;
    }

    // Import vaults
    counts.vaults = 0;
    for (const vault of data.vaults) {
      const oldVaultId = vault.id as string;
      const newVaultId = remapId(oldVaultId, idMapping);
      const ownerId = idMapping[vault.owner_id as string] ?? vault.owner_id;
      await client.query(
        `INSERT INTO public.legacy_vaults (id, family_id, owner_id, title, description, status, release_condition, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [newVaultId, familyId, ownerId, vault.title, vault.description ?? null,
         vault.status ?? 'active', vault.release_condition ?? 'manual',
         vault.created_at ?? new Date().toISOString()],
      );
      counts.vaults++;
    }

    // Import vault items
    counts.vault_items = 0;
    for (const item of data.vault_items) {
      const oldItemId = item.id as string;
      const newItemId = remapId(oldItemId, idMapping);
      const vaultId = idMapping[item.vault_id as string] ?? item.vault_id;
      await client.query(
        `INSERT INTO public.vault_items (id, vault_id, content_type, title, content, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newItemId, vaultId, item.content_type, item.title ?? null,
         item.content ?? null, item.sort_order ?? 0],
      );
      counts.vault_items++;
    }

    // Import relationships
    counts.relationships = 0;
    for (const rel of data.relationships) {
      const oldRelId = rel.id as string;
      const newRelId = remapId(oldRelId, idMapping);
      const fromUserId = idMapping[rel.from_user_id as string] ?? rel.from_user_id;
      const toUserId = idMapping[rel.to_user_id as string] ?? rel.to_user_id;
      await client.query(
        `INSERT INTO public.relationships (id, family_id, from_user_id, to_user_id, relationship_type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newRelId, familyId, fromUserId, toUserId,
         rel.relationship_type, rel.created_at ?? new Date().toISOString()],
      );
      counts.relationships++;
    }

    await client.query('COMMIT');

    return {
      family_id: familyId,
      counts,
      id_mapping: idMapping,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Delete ALL data associated with a family (GDPR right-to-erasure).
 * Deletes in foreign-key-safe order to avoid constraint violations.
 * @param pool - Database pool
 * @param familyId - Family UUID to delete
 * @returns Deletion summary with counts per entity type
 */
export async function deleteFamilyData(pool: Pool, familyId: string): Promise<DeletionSummary> {
  const client = await pool.connect();
  const counts: Record<string, number> = {};

  try {
    await client.query('BEGIN');

    // Delete in reverse dependency order (children first)

    // 1. Messages (depend on conversations)
    const msgResult = await client.query(
      `DELETE FROM public.messages WHERE conversation_id IN
       (SELECT id FROM public.conversations WHERE family_id = $1)`,
      [familyId],
    );
    counts.messages = msgResult.rowCount ?? 0;

    // 2. Conversations
    const convResult = await client.query(
      `DELETE FROM public.conversations WHERE family_id = $1`,
      [familyId],
    );
    counts.conversations = convResult.rowCount ?? 0;

    // 3. Vault items (depend on legacy_vaults)
    const viResult = await client.query(
      `DELETE FROM public.vault_items WHERE vault_id IN
       (SELECT id FROM public.legacy_vaults WHERE family_id = $1)`,
      [familyId],
    );
    counts.vault_items = viResult.rowCount ?? 0;

    // 4. Legacy vaults
    const vaultResult = await client.query(
      `DELETE FROM public.legacy_vaults WHERE family_id = $1`,
      [familyId],
    );
    counts.vaults = vaultResult.rowCount ?? 0;

    // 5. Events
    const eventResult = await client.query(
      `DELETE FROM public.events WHERE family_id = $1`,
      [familyId],
    );
    counts.events = eventResult.rowCount ?? 0;

    // 6. Recipes
    const recipeResult = await client.query(
      `DELETE FROM public.recipes WHERE family_id = $1`,
      [familyId],
    );
    counts.recipes = recipeResult.rowCount ?? 0;

    // 7. Media items (media_variants cascade via FK typically, but be explicit)
    const variantResult = await client.query(
      `DELETE FROM public.media_variants WHERE media_item_id IN
       (SELECT id FROM public.media_items WHERE family_id = $1)`,
      [familyId],
    );
    counts.media_variants = variantResult.rowCount ?? 0;

    const mediaResult = await client.query(
      `DELETE FROM public.media_items WHERE family_id = $1`,
      [familyId],
    );
    counts.media_items = mediaResult.rowCount ?? 0;

    // 8. Posts
    const postResult = await client.query(
      `DELETE FROM public.posts WHERE family_id = $1`,
      [familyId],
    );
    counts.posts = postResult.rowCount ?? 0;

    // 9. Relationships
    const relResult = await client.query(
      `DELETE FROM public.relationships WHERE family_id = $1`,
      [familyId],
    );
    counts.relationships = relResult.rowCount ?? 0;

    // 10. Family members
    const memberResult = await client.query(
      `DELETE FROM public.family_members WHERE family_id = $1`,
      [familyId],
    );
    counts.family_members = memberResult.rowCount ?? 0;

    // 11. Audit events
    const auditResult = await client.query(
      `DELETE FROM public.audit_events WHERE family_id = $1`,
      [familyId],
    );
    counts.audit_events = auditResult.rowCount ?? 0;

    // 12. Family record itself (last, after all dependents)
    const familyResult = await client.query(
      `DELETE FROM public.families WHERE id = $1`,
      [familyId],
    );
    counts.families = familyResult.rowCount ?? 0;

    await client.query('COMMIT');

    return {
      family_id: familyId,
      counts,
      completed_at: new Date().toISOString(),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Verify data integrity for a family by checking foreign key relationships
 * and detecting orphaned records.
 * @param pool - Database pool
 * @param familyId - Family UUID to verify
 * @returns Integrity report with any issues found
 */
export async function verifyDataIntegrity(pool: Pool, familyId: string): Promise<IntegrityReport> {
  const issues: string[] = [];

  // Check family exists
  const { rows: [family] } = await pool.query(
    `SELECT id FROM public.families WHERE id = $1`,
    [familyId],
  );
  if (!family) {
    return {
      family_id: familyId,
      valid: false,
      issues: ['Family record not found'],
      checked_at: new Date().toISOString(),
    };
  }

  // Check for posts with missing authors
  const { rows: orphanedPosts } = await pool.query(
    `SELECT p.id FROM public.posts p
     WHERE p.family_id = $1
     AND p.author_id NOT IN (SELECT user_id FROM public.family_members WHERE family_id = $1)`,
    [familyId],
  );
  if (orphanedPosts.length > 0) {
    issues.push(`${orphanedPosts.length} post(s) with authors not in family members`);
  }

  // Check for media items with missing uploaders
  const { rows: orphanedMedia } = await pool.query(
    `SELECT mi.id FROM public.media_items mi
     WHERE mi.family_id = $1
     AND mi.uploaded_by NOT IN (SELECT user_id FROM public.family_members WHERE family_id = $1)`,
    [familyId],
  );
  if (orphanedMedia.length > 0) {
    issues.push(`${orphanedMedia.length} media item(s) with uploaders not in family members`);
  }

  // Check for orphaned media variants (variant pointing to non-existent media item)
  const { rows: orphanedVariants } = await pool.query(
    `SELECT mv.id FROM public.media_variants mv
     WHERE mv.media_item_id IN (SELECT id FROM public.media_items WHERE family_id = $1)
     AND mv.media_item_id NOT IN (SELECT id FROM public.media_items WHERE family_id = $1)`,
    [familyId],
  );
  // The above query is a tautology for variants within the family; check cross-family instead:
  const { rows: danglingVariants } = await pool.query(
    `SELECT mv.id FROM public.media_variants mv
     JOIN public.media_items mi ON mi.id = mv.media_item_id
     WHERE mi.family_id = $1
     AND NOT EXISTS (SELECT 1 FROM public.media_items mi2 WHERE mi2.id = mv.media_item_id)`,
    [familyId],
  );
  if (danglingVariants.length > 0) {
    issues.push(`${danglingVariants.length} media variant(s) referencing non-existent media items`);
  }

  // Check for messages in conversations that don't belong to the family
  const { rows: orphanedMessages } = await pool.query(
    `SELECT m.id FROM public.messages m
     JOIN public.conversations c ON c.id = m.conversation_id
     WHERE c.family_id = $1
     AND m.sender_id NOT IN (SELECT user_id FROM public.family_members WHERE family_id = $1)`,
    [familyId],
  );
  if (orphanedMessages.length > 0) {
    issues.push(`${orphanedMessages.length} message(s) from senders not in family members`);
  }

  // Check for vault items pointing to non-existent vaults
  const { rows: orphanedVaultItems } = await pool.query(
    `SELECT vi.id FROM public.vault_items vi
     WHERE vi.vault_id IN (SELECT id FROM public.legacy_vaults WHERE family_id = $1)
     AND NOT EXISTS (SELECT 1 FROM public.legacy_vaults lv WHERE lv.id = vi.vault_id)`,
    [familyId],
  );
  if (orphanedVaultItems.length > 0) {
    issues.push(`${orphanedVaultItems.length} vault item(s) referencing non-existent vaults`);
  }

  // Check for relationships with missing users
  const { rows: orphanedRels } = await pool.query(
    `SELECT r.id FROM public.relationships r
     WHERE r.family_id = $1
     AND (r.from_user_id NOT IN (SELECT user_id FROM public.family_members WHERE family_id = $1)
       OR r.to_user_id NOT IN (SELECT user_id FROM public.family_members WHERE family_id = $1))`,
    [familyId],
  );
  if (orphanedRels.length > 0) {
    issues.push(`${orphanedRels.length} relationship(s) referencing users not in family members`);
  }

  return {
    family_id: familyId,
    valid: issues.length === 0,
    issues,
    checked_at: new Date().toISOString(),
  };
}

/**
 * Get a summary of data counts for all entity types belonging to a family.
 * @param pool - Database pool
 * @param familyId - Family UUID
 * @returns Object with counts per entity type
 */
export async function getDataSummary(pool: Pool, familyId: string): Promise<DataSummary> {
  const { rows: [memberCount] } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM public.family_members WHERE family_id = $1`,
    [familyId],
  );

  const { rows: [postCount] } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM public.posts WHERE family_id = $1`,
    [familyId],
  );

  const { rows: [mediaCount] } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM public.media_items WHERE family_id = $1`,
    [familyId],
  );

  const { rows: [eventCount] } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM public.events WHERE family_id = $1`,
    [familyId],
  );

  const { rows: [recipeCount] } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM public.recipes WHERE family_id = $1`,
    [familyId],
  );

  const { rows: [conversationCount] } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM public.conversations WHERE family_id = $1`,
    [familyId],
  );

  const { rows: [messageCount] } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM public.messages
     WHERE conversation_id IN (SELECT id FROM public.conversations WHERE family_id = $1)`,
    [familyId],
  );

  const { rows: [vaultCount] } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM public.legacy_vaults WHERE family_id = $1`,
    [familyId],
  );

  return {
    members: memberCount?.count ?? 0,
    posts: postCount?.count ?? 0,
    media: mediaCount?.count ?? 0,
    events: eventCount?.count ?? 0,
    recipes: recipeCount?.count ?? 0,
    conversations: conversationCount?.count ?? 0,
    messages: messageCount?.count ?? 0,
    vaults: vaultCount?.count ?? 0,
  };
}
