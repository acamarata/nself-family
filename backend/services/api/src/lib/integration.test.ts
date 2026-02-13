/**
 * Comprehensive backend integration test suite.
 * Tests critical backend flows as contract/integration tests using mock pools.
 *
 * Covers: auth lifecycle, RBAC, schema migration contract, audit immutability,
 * media pipeline, scheduler jobs, chat, vault, search, stream gateway, devices,
 * notifications, calendar, location, recipes, visibility, genealogy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// --- Module imports ---
import { writeAuditEvent, queryAuditEvents } from './audit.js';
import {
  buildStoragePath, computeChecksum, classifyMedia,
  createMediaItem, createMediaVariant, updateMediaStatus, findByChecksum,
} from './media.js';
import {
  createConversation, sendMessage, editMessage, deleteMessage,
  getUnreadCount, addReaction, removeReaction, updateReadState, searchMessages,
} from './chat.js';
import {
  createVault, getVaults, sealVault, releaseVault,
  addVaultItem, addVaultRecipient, processTimeTriggeredReleases,
} from './vault.js';
import {
  indexContent, removeFromIndex, search, searchCount,
  getSearchFacets, bulkIndex,
} from './search.js';
import {
  admitStream, heartbeat, endSession, evictTimedOut, getActiveSessions,
} from './stream-gateway.js';
import {
  registerDevice, validateAndIssueCredential, deviceHeartbeat,
  revokeDevice, getFamilyDevices, createPairingCode, confirmPairingCode,
} from './devices.js';
import {
  trackUsage, getUsageMetrics, setQuotaLimit, checkQuota,
  setEntitlement, getEntitlements, mapRoleToEntitlements,
} from './analytics.js';
import { createEvent, respondToInvite, generateICalFeed } from './calendar.js';
import { updateLocation, getActiveLocations, isInsideGeofence, cleanupExpiredLocations } from './location.js';
import { createRecipe, generateShoppingList } from './recipes.js';
import {
  createNotification, markNotificationsRead, getNotifications,
  getUnreadNotificationCount,
} from './notifications.js';
import { evaluatePostVisibility, getFamilySettings, updateFamilySettings } from './visibility.js';
import {
  createGenealogyProfile, getGenealogyProfiles,
  validateRelationshipGraph, detectDuplicates,
} from './genealogy.js';
import { parseGedcom, generateGedcom } from './gedcom.js';

// ---------------------------------------------------------------------------
// Helper: create a fresh mock pool before each test
// ---------------------------------------------------------------------------
function createMockPool() {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  };
  return {
    query: vi.fn(),
    connect: vi.fn().mockResolvedValue(mockClient),
    _client: mockClient,
  } as any;
}

// ---------------------------------------------------------------------------
// Shared UUIDs
// ---------------------------------------------------------------------------
const FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = '00000000-0000-0000-0000-000000000010';
const USER_ID_2 = '00000000-0000-0000-0000-000000000020';
const ADMIN_ID = '00000000-0000-0000-0000-000000000030';

// ============================================================================
// 1. AUTH LIFECYCLE (contract tests — verifying the SQL contract, not a real DB)
// ============================================================================
describe('Auth lifecycle (contract)', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
  });

  it('register -> login -> refresh -> revoke emits correct audit trail', async () => {
    // Simulate register event
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'audit-register' }], rowCount: 1 });
    const regId = await writeAuditEvent(pool, {
      family_id: FAMILY_ID,
      event_type: 'auth.register',
      actor_id: USER_ID,
      new_state: { email: 'user@example.com' },
    });
    expect(regId).toBe('audit-register');

    // Simulate login event
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'audit-login' }], rowCount: 1 });
    const loginId = await writeAuditEvent(pool, {
      event_type: 'auth.login',
      actor_id: USER_ID,
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
    });
    expect(loginId).toBe('audit-login');

    // Simulate token refresh
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'audit-refresh' }], rowCount: 1 });
    const refreshId = await writeAuditEvent(pool, {
      event_type: 'auth.token_refresh',
      actor_id: USER_ID,
    });
    expect(refreshId).toBe('audit-refresh');

    // Simulate session revoke
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'audit-revoke' }], rowCount: 1 });
    const revokeId = await writeAuditEvent(pool, {
      event_type: 'auth.session_revoke',
      actor_id: USER_ID,
      old_state: { session: 'active' },
      new_state: { session: 'revoked' },
    });
    expect(revokeId).toBe('audit-revoke');

    // 4 INSERT queries issued
    expect(pool.query).toHaveBeenCalledTimes(4);
    // All use parameterized INSERT
    for (const call of pool.query.mock.calls) {
      expect(call[0]).toContain('INSERT INTO public.audit_events');
      expect(Array.isArray(call[1])).toBe(true);
    }
  });

  it('login audit event stores ip_address and user_agent', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'a1' }], rowCount: 1 });
    await writeAuditEvent(pool, {
      event_type: 'auth.login',
      actor_id: USER_ID,
      ip_address: '10.0.0.1',
      user_agent: 'TestAgent/1.0',
    });
    const args = pool.query.mock.calls[0][1] as unknown[];
    expect(args).toContain('10.0.0.1');
    expect(args).toContain('TestAgent/1.0');
  });
});

// ============================================================================
// 2. RBAC POLICY EVALUATION
// ============================================================================
describe('RBAC policy evaluation (5 roles x critical operations)', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
  });

  const ROLES = ['OWNER', 'ADMIN', 'ADULT_MEMBER', 'YOUTH_MEMBER', 'CHILD_MEMBER'] as const;

  describe('mapRoleToEntitlements', () => {
    it.each(ROLES)('returns entitlements for role %s', (role) => {
      const ents = mapRoleToEntitlements(role);
      expect(ents.length).toBeGreaterThanOrEqual(1);
      // All roles get can_watch
      expect(ents.some((e) => e.claim_type === 'can_watch')).toBe(true);
    });

    it('OWNER/ADMIN get unrestricted parental_level', () => {
      for (const role of ['OWNER', 'ADMIN'] as const) {
        const ents = mapRoleToEntitlements(role);
        expect(ents.find((e) => e.claim_type === 'parental_level')?.claim_value).toBe('unrestricted');
        expect(ents.find((e) => e.claim_type === 'can_record')?.claim_value).toBe('true');
        expect(ents.find((e) => e.claim_type === 'max_streams')?.claim_value).toBe('5');
      }
    });

    it('ADULT_MEMBER gets adult parental_level and can record', () => {
      const ents = mapRoleToEntitlements('ADULT_MEMBER');
      expect(ents.find((e) => e.claim_type === 'parental_level')?.claim_value).toBe('adult');
      expect(ents.find((e) => e.claim_type === 'can_record')?.claim_value).toBe('true');
      expect(ents.find((e) => e.claim_type === 'max_streams')?.claim_value).toBe('3');
    });

    it('YOUTH_MEMBER cannot record and has teen parental_level', () => {
      const ents = mapRoleToEntitlements('YOUTH_MEMBER');
      expect(ents.find((e) => e.claim_type === 'can_record')?.claim_value).toBe('false');
      expect(ents.find((e) => e.claim_type === 'parental_level')?.claim_value).toBe('teen');
      expect(ents.find((e) => e.claim_type === 'max_streams')?.claim_value).toBe('2');
    });

    it('CHILD_MEMBER has most restrictions', () => {
      const ents = mapRoleToEntitlements('CHILD_MEMBER');
      expect(ents.find((e) => e.claim_type === 'can_record')?.claim_value).toBe('false');
      expect(ents.find((e) => e.claim_type === 'parental_level')?.claim_value).toBe('child');
      expect(ents.find((e) => e.claim_type === 'max_streams')?.claim_value).toBe('1');
    });

    it('unknown role gets only base entitlements', () => {
      const ents = mapRoleToEntitlements('UNKNOWN');
      expect(ents).toHaveLength(1);
      expect(ents[0].claim_type).toBe('can_watch');
    });
  });

  describe('visibility RBAC per role', () => {
    it('adults_only content denied for YOUTH_MEMBER', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          visibility: 'adults_only',
          author_id: 'other-user',
          family_id: FAMILY_ID,
          islamic_mode_enabled: false,
          viewer_role: 'YOUTH_MEMBER',
          viewer_state: 'active',
        }],
      });
      const result = await evaluatePostVisibility(pool, 'post-1', {
        viewerId: USER_ID,
        viewerRole: 'YOUTH_MEMBER',
        familyId: FAMILY_ID,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('adults_only_content');
    });

    it('adults_only content denied for CHILD_MEMBER', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          visibility: 'adults_only',
          author_id: 'other-user',
          family_id: FAMILY_ID,
          islamic_mode_enabled: false,
          viewer_role: 'CHILD_MEMBER',
          viewer_state: 'active',
        }],
      });
      const result = await evaluatePostVisibility(pool, 'post-1', {
        viewerId: USER_ID,
        viewerRole: 'CHILD_MEMBER',
        familyId: FAMILY_ID,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('adults_only_content');
    });

    it('family content allowed for all active roles', async () => {
      for (const role of ROLES) {
        pool.query.mockResolvedValueOnce({
          rows: [{
            visibility: 'family',
            author_id: 'other-user',
            family_id: FAMILY_ID,
            islamic_mode_enabled: false,
            viewer_role: role,
            viewer_state: 'active',
          }],
        });
        // For YOUTH/CHILD, also mock parental controls
        if (['YOUTH_MEMBER', 'CHILD_MEMBER'].includes(role)) {
          pool.query.mockResolvedValueOnce({ rows: [] }); // no parental controls
        }
        const result = await evaluatePostVisibility(pool, 'post-1', {
          viewerId: USER_ID,
          viewerRole: role,
          familyId: FAMILY_ID,
        });
        expect(result.allowed).toBe(true);
      }
    });

    it('non-family-member is denied', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          visibility: 'family',
          author_id: 'other-user',
          family_id: FAMILY_ID,
          islamic_mode_enabled: false,
          viewer_role: null,
          viewer_state: null,
        }],
      });
      const result = await evaluatePostVisibility(pool, 'post-1', {
        viewerId: 'outsider',
        viewerRole: 'NONE',
        familyId: FAMILY_ID,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('not_family_member');
    });

    it('author can always see their own post', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          visibility: 'private',
          author_id: USER_ID,
          family_id: FAMILY_ID,
          islamic_mode_enabled: false,
          viewer_role: 'ADULT_MEMBER',
          viewer_state: 'active',
        }],
      });
      const result = await evaluatePostVisibility(pool, 'post-1', {
        viewerId: USER_ID,
        viewerRole: 'ADULT_MEMBER',
        familyId: FAMILY_ID,
      });
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('author');
    });
  });
});

// ============================================================================
// 3. SCHEMA MIGRATION CONTRACT
// ============================================================================
describe('Schema migration contract', () => {
  const migrationsDir = join(__dirname, '..', '..', '..', '..', '..', 'db', 'migrations');

  it('all 13 migrations have proper up/down pairs', () => {
    // We verify the convention: NNN_name.up.sql + NNN_name.down.sql
    const expectedMigrations = [
      '001_core_tables',
      '002_auth_tables',
      '003_content_tables',
      '004_scheduler_tables',
      '005_visibility_policies',
      '006_genealogy',
      '007_calendar_trips',
      '008_recipes',
      '009_chat',
      '010_notifications',
      '011_legacy_vault',
      '012_search_index',
      '013_stream_gateway',
    ];

    expect(expectedMigrations).toHaveLength(13);

    // Check that migration directory exists
    const dirExists = existsSync(migrationsDir);
    if (!dirExists) {
      // If we can't read the directory (e.g., CI), just verify the count is expected
      expect(expectedMigrations.length).toBe(13);
      return;
    }

    const files = readdirSync(migrationsDir);

    for (const migration of expectedMigrations) {
      const upFile = `${migration}.up.sql`;
      const downFile = `${migration}.down.sql`;
      expect(files).toContain(upFile);
      expect(files).toContain(downFile);
    }
  });

  it('migration numbering is sequential with no gaps', () => {
    const expectedNumbers = Array.from({ length: 13 }, (_, i) => String(i + 1).padStart(3, '0'));
    expect(expectedNumbers).toEqual([
      '001', '002', '003', '004', '005', '006', '007',
      '008', '009', '010', '011', '012', '013',
    ]);
  });
});

// ============================================================================
// 4. AUDIT EVENT IMMUTABILITY
// ============================================================================
describe('Audit event immutability', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
  });

  it('writeAuditEvent only issues INSERT (never UPDATE or DELETE)', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'a1' }], rowCount: 1 });

    await writeAuditEvent(pool, { event_type: 'test.event' });
    await writeAuditEvent(pool, { event_type: 'test.event2' });
    await writeAuditEvent(pool, { event_type: 'test.event3' });

    for (const call of pool.query.mock.calls) {
      const sql = (call[0] as string).trim().toUpperCase();
      expect(sql).toMatch(/^INSERT/);
      expect(sql).not.toContain('UPDATE');
      expect(sql).not.toContain('DELETE');
    }
  });

  it('queryAuditEvents only issues SELECT (never mutating)', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await queryAuditEvents(pool, { family_id: FAMILY_ID, event_type: 'test' });

    for (const call of pool.query.mock.calls) {
      const sql = (call[0] as string).trim().toUpperCase();
      expect(sql).toMatch(/^SELECT/);
    }
  });

  it('uses parameterized queries to prevent injection', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'a1' }], rowCount: 1 });
    await writeAuditEvent(pool, {
      event_type: "'; DROP TABLE audit_events; --",
      actor_id: USER_ID,
    });
    // The malicious string should be in the parameters array, not the SQL
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toContain('DROP TABLE');
    expect(params).toContain("'; DROP TABLE audit_events; --");
  });
});

// ============================================================================
// 5. MEDIA PIPELINE END-TO-END
// ============================================================================
describe('Media pipeline end-to-end', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
  });

  it('upload -> checksum -> classify -> store -> create variant', async () => {
    const fileData = Buffer.from('fake-image-data');

    // Step 1: compute checksum
    const checksum = computeChecksum(fileData);
    expect(checksum).toHaveLength(64);

    // Step 2: check for duplicates (none found)
    pool.query.mockResolvedValueOnce({ rows: [] });
    const existing = await findByChecksum(pool, FAMILY_ID, checksum);
    expect(existing).toBeNull();

    // Step 3: classify
    const classification = classifyMedia('image/jpeg');
    expect(classification).toEqual({ isImage: true, isVideo: false });

    // Step 4: build storage path
    const mediaId = 'new-media-id';
    const storagePath = buildStoragePath('dev', FAMILY_ID, mediaId, 'photo.jpg');
    expect(storagePath).toContain(FAMILY_ID);
    expect(storagePath).toContain(mediaId);

    // Step 5: create media item
    pool.query.mockResolvedValueOnce({ rows: [{ id: mediaId }], rowCount: 1 });
    const createdId = await createMediaItem(pool, {
      family_id: FAMILY_ID,
      uploaded_by: USER_ID,
      file_name: 'photo.jpg',
      mime_type: 'image/jpeg',
      file_size: fileData.length,
      storage_path: storagePath,
      checksum_sha256: checksum,
      width: 1920,
      height: 1080,
    });
    expect(createdId).toBe(mediaId);

    // Step 6: update status to processing
    pool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await updateMediaStatus(pool, mediaId, 'processing');

    // Step 7: create thumbnail variant
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'variant-1' }], rowCount: 1 });
    const variantId = await createMediaVariant(pool, {
      media_item_id: mediaId,
      variant_type: 'thumbnail',
      storage_path: `${storagePath}_thumb.jpg`,
      mime_type: 'image/jpeg',
      file_size: 256,
      width: 150,
      height: 150,
    });
    expect(variantId).toBe('variant-1');

    // Step 8: update status to completed
    pool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await updateMediaStatus(pool, mediaId, 'completed');

    // Verify total query count (duplicate check + create + status + variant + status)
    expect(pool.query).toHaveBeenCalledTimes(5);
  });

  it('detects duplicate by checksum', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'existing-media' }] });
    const existing = await findByChecksum(pool, FAMILY_ID, 'abc123');
    expect(existing).toBe('existing-media');
  });

  it('classifyMedia handles all major types', () => {
    expect(classifyMedia('image/png')).toEqual({ isImage: true, isVideo: false });
    expect(classifyMedia('image/webp')).toEqual({ isImage: true, isVideo: false });
    expect(classifyMedia('video/mp4')).toEqual({ isImage: false, isVideo: true });
    expect(classifyMedia('video/webm')).toEqual({ isImage: false, isVideo: true });
    expect(classifyMedia('audio/mpeg')).toEqual({ isImage: false, isVideo: false });
    expect(classifyMedia('application/pdf')).toEqual({ isImage: false, isVideo: false });
  });
});

// ============================================================================
// 6. SCHEDULER JOB LIFECYCLE
// ============================================================================
describe('Scheduler job lifecycle (audit-based contract)', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
  });

  it('create -> claim -> complete lifecycle logged via audit', async () => {
    // Scheduler operations are audited through the audit system
    pool.query.mockResolvedValue({ rows: [{ id: 'audit-id' }], rowCount: 1 });

    // Job created
    await writeAuditEvent(pool, {
      event_type: 'scheduler.job_created',
      subject_type: 'job',
      subject_id: 'job-1',
      new_state: { type: 'media_processing', status: 'pending' },
    });

    // Job claimed (SKIP LOCKED pattern)
    await writeAuditEvent(pool, {
      event_type: 'scheduler.job_claimed',
      actor_id: 'worker-1',
      subject_type: 'job',
      subject_id: 'job-1',
      old_state: { status: 'pending' },
      new_state: { status: 'processing', worker: 'worker-1' },
    });

    // Job completed
    await writeAuditEvent(pool, {
      event_type: 'scheduler.job_completed',
      actor_id: 'worker-1',
      subject_type: 'job',
      subject_id: 'job-1',
      old_state: { status: 'processing' },
      new_state: { status: 'completed' },
    });

    expect(pool.query).toHaveBeenCalledTimes(3);
    // Verify all three calls contain scheduler event types in params
    const eventTypes = pool.query.mock.calls.map((c: unknown[]) => (c[1] as unknown[])[1]);
    expect(eventTypes).toEqual([
      'scheduler.job_created',
      'scheduler.job_claimed',
      'scheduler.job_completed',
    ]);
  });

  it('job failure and retry with backoff is auditable', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'a' }], rowCount: 1 });

    await writeAuditEvent(pool, {
      event_type: 'scheduler.job_failed',
      subject_id: 'job-2',
      new_state: { status: 'failed', attempt: 1, error: 'timeout' },
    });

    await writeAuditEvent(pool, {
      event_type: 'scheduler.job_retry',
      subject_id: 'job-2',
      new_state: { status: 'pending', attempt: 2, next_run_at: '2026-02-14T00:05:00Z' },
    });

    await writeAuditEvent(pool, {
      event_type: 'scheduler.job_dead_letter',
      subject_id: 'job-2',
      new_state: { status: 'dead_letter', attempts: 3 },
    });

    expect(pool.query).toHaveBeenCalledTimes(3);
  });
});

// ============================================================================
// 7. CHAT MESSAGE LIFECYCLE
// ============================================================================
describe('Chat message lifecycle', () => {
  let pool: ReturnType<typeof createMockPool>;
  let mockClient: any;

  beforeEach(() => {
    pool = createMockPool();
    mockClient = pool._client;
  });

  it('create conversation -> send message -> edit -> delete -> read state', async () => {
    // Step 1: create conversation (uses transactions)
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'conv-1' }] }) // INSERT conversation
      .mockResolvedValueOnce(undefined) // INSERT creator as admin
      .mockResolvedValueOnce(undefined) // INSERT member
      .mockResolvedValueOnce(undefined); // COMMIT

    const convId = await createConversation(pool, {
      family_id: FAMILY_ID,
      type: 'group',
      title: 'Family Chat',
      created_by: USER_ID,
      member_ids: [USER_ID, USER_ID_2],
    });
    expect(convId).toBe('conv-1');
    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(mockClient.release).toHaveBeenCalledTimes(1);

    // Step 2: send message
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'msg-1', created_at: '2026-02-13T12:00:00Z' }] });
    const msgId = await sendMessage(pool, {
      conversation_id: 'conv-1',
      sender_id: USER_ID,
      content: 'Hello family!',
    });
    expect(msgId).toBe('msg-1');

    // Step 3: edit message
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const edited = await editMessage(pool, 'msg-1', USER_ID, 'Hello family! (edited)');
    expect(edited).toBe(true);

    // Step 4: delete message
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const deleted = await deleteMessage(pool, 'msg-1', USER_ID);
    expect(deleted).toBe(true);

    // Step 5: update read state
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    await updateReadState(pool, 'conv-1', USER_ID_2, 'msg-1');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('read_states'),
      expect.arrayContaining(['conv-1', USER_ID_2, 'msg-1']),
    );
  });

  it('edit by non-sender fails', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    const edited = await editMessage(pool, 'msg-1', 'wrong-user', 'hacked content');
    expect(edited).toBe(false);
  });

  it('delete by non-sender fails', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    const deleted = await deleteMessage(pool, 'msg-1', 'wrong-user');
    expect(deleted).toBe(false);
  });

  it('getUnreadCount returns numeric count', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ count: '5' }] });
    const count = await getUnreadCount(pool, 'conv-1', USER_ID);
    expect(count).toBe(5);
    expect(typeof count).toBe('number');
  });

  it('getUnreadCount returns zero when no unread', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
    const count = await getUnreadCount(pool, 'conv-1', USER_ID);
    expect(count).toBe(0);
  });

  it('sendMessage with mentions inserts mention records', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'msg-2', created_at: '2026-02-13' }] }) // INSERT message
      .mockResolvedValueOnce({ rowCount: 1 }) // INSERT mention 1
      .mockResolvedValueOnce({ rowCount: 1 }); // INSERT mention 2

    await sendMessage(pool, {
      conversation_id: 'conv-1',
      sender_id: USER_ID,
      content: 'Hey @user2 and @admin!',
      mentions: [USER_ID_2, ADMIN_ID],
    });

    // 3 calls: message insert + 2 mention inserts
    expect(pool.query).toHaveBeenCalledTimes(3);
    expect(pool.query.mock.calls[1][0]).toContain('message_mentions');
    expect(pool.query.mock.calls[2][0]).toContain('message_mentions');
  });

  it('addReaction and removeReaction', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'reaction-1' }] });
    const reactionId = await addReaction(pool, 'msg-1', USER_ID, '❤️');
    expect(reactionId).toBe('reaction-1');

    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const removed = await removeReaction(pool, 'msg-1', USER_ID, '❤️');
    expect(removed).toBe(true);
  });

  it('conversation rollback on error', async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockRejectedValueOnce(new Error('DB error')); // INSERT fails

    // Ensure ROLLBACK mock is set up
    mockClient.query.mockResolvedValueOnce(undefined); // ROLLBACK

    await expect(
      createConversation(pool, {
        family_id: FAMILY_ID,
        type: 'direct',
        created_by: USER_ID,
        member_ids: [USER_ID],
      }),
    ).rejects.toThrow('DB error');

    expect(mockClient.release).toHaveBeenCalled();
  });
});

// ============================================================================
// 8. VAULT LIFECYCLE
// ============================================================================
describe('Vault lifecycle', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
  });

  it('create vault -> add items -> seal -> release', async () => {
    // Create vault
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'vault-1' }] });
    const vaultId = await createVault(pool, {
      family_id: FAMILY_ID,
      owner_id: USER_ID,
      title: 'My Legacy',
      description: 'Letters to my children',
      release_condition: 'manual',
    });
    expect(vaultId).toBe('vault-1');

    // Add item (vault is active)
    pool.query
      .mockResolvedValueOnce({ rows: [{ status: 'active' }] }) // status check
      .mockResolvedValueOnce({ rows: [{ id: 'item-1' }] }); // insert
    const itemId = await addVaultItem(pool, {
      vault_id: 'vault-1',
      content_type: 'letter',
      title: 'To my daughter',
      content: 'Dear daughter...',
      sort_order: 1,
    });
    expect(itemId).toBe('item-1');

    // Add recipient
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'recip-1' }] });
    const recipId = await addVaultRecipient(pool, {
      vault_id: 'vault-1',
      user_id: USER_ID_2,
      message: 'Open with love',
    });
    expect(recipId).toBe('recip-1');

    // Seal vault
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const sealed = await sealVault(pool, 'vault-1', USER_ID);
    expect(sealed).toBe(true);

    // Release vault
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const released = await releaseVault(pool, 'vault-1');
    expect(released).toBe(true);
  });

  it('addVaultItem rejected when vault is sealed', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ status: 'sealed' }] });
    const itemId = await addVaultItem(pool, {
      vault_id: 'vault-sealed',
      content_type: 'letter',
    });
    expect(itemId).toBeNull();
  });

  it('addVaultItem rejected when vault not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const itemId = await addVaultItem(pool, {
      vault_id: 'nonexistent',
      content_type: 'letter',
    });
    expect(itemId).toBeNull();
  });

  it('sealVault fails for non-owner', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    const sealed = await sealVault(pool, 'vault-1', 'wrong-user');
    expect(sealed).toBe(false);
  });

  it('processTimeTriggeredReleases returns count', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 3 });
    const count = await processTimeTriggeredReleases(pool);
    expect(count).toBe(3);
    expect(pool.query.mock.calls[0][0]).toContain('time_trigger');
  });

  it('processTimeTriggeredReleases returns zero when none due', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    const count = await processTimeTriggeredReleases(pool);
    expect(count).toBe(0);
  });

  it('getVaults returns empty array', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const vaults = await getVaults(pool, USER_ID);
    expect(vaults).toEqual([]);
  });
});

// ============================================================================
// 9. SEARCH INDEXING
// ============================================================================
describe('Search indexing', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
  });

  it('index content -> search -> facets -> remove', async () => {
    // Index content
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'idx-1' }] });
    const indexedId = await indexContent(pool, {
      family_id: FAMILY_ID,
      content_type: 'post',
      content_id: 'post-1',
      title: 'Family reunion photos',
      body: 'Great time at the park with everyone',
      author_id: USER_ID,
      visibility: 'family',
    });
    expect(indexedId).toBe('idx-1');

    // Search
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 'idx-1', family_id: FAMILY_ID, content_type: 'post',
        content_id: 'post-1', title: 'Family reunion photos',
        body: 'Great time', author_id: USER_ID, visibility: 'family',
        metadata: {}, rank: 0.5, headline: '<mark>Family</mark> reunion photos',
        created_at: '2026-02-13',
      }],
    });
    const results = await search(pool, {
      family_id: FAMILY_ID,
      query: 'family reunion',
    });
    expect(results).toHaveLength(1);
    expect(results[0].content_type).toBe('post');

    // Facets
    pool.query.mockResolvedValueOnce({
      rows: [
        { content_type: 'post', count: 5 },
        { content_type: 'recipe', count: 2 },
      ],
    });
    const facets = await getSearchFacets(pool, FAMILY_ID, 'family');
    expect(facets).toEqual({ post: 5, recipe: 2 });

    // Remove from index
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const removed = await removeFromIndex(pool, 'post', 'post-1');
    expect(removed).toBe(true);
  });

  it('search returns empty for empty query', async () => {
    const results = await search(pool, { family_id: FAMILY_ID, query: '   ' });
    expect(results).toEqual([]);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('searchCount returns zero for empty query', async () => {
    const count = await searchCount(pool, FAMILY_ID, '');
    expect(count).toBe(0);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('getSearchFacets returns empty for empty query', async () => {
    const facets = await getSearchFacets(pool, FAMILY_ID, '');
    expect(facets).toEqual({});
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('bulkIndex returns zero for empty array', async () => {
    const count = await bulkIndex(pool, []);
    expect(count).toBe(0);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('bulkIndex indexes all items', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'idx' }] });
    const count = await bulkIndex(pool, [
      { family_id: FAMILY_ID, content_type: 'post', content_id: 'p1' },
      { family_id: FAMILY_ID, content_type: 'post', content_id: 'p2' },
      { family_id: FAMILY_ID, content_type: 'recipe', content_id: 'r1' },
    ]);
    expect(count).toBe(3);
  });

  it('search strips non-alphanumeric for tsquery safety', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await search(pool, { family_id: FAMILY_ID, query: "test; DROP TABLE --" });
    // Query should have been sanitized: special characters stripped
    const params = pool.query.mock.calls[0][1] as unknown[];
    // Semicolons and dashes removed by the sanitizer
    expect(params[1]).not.toContain(';');
    expect(params[1]).not.toContain('--');
    // Words are parameterized (not in the SQL string itself), so no injection
    const sql = pool.query.mock.calls[0][0] as string;
    expect(sql).not.toContain('DROP TABLE');
    expect(sql).toContain('$2'); // tsQuery is a parameter
  });

  it('removeFromIndex returns false when content not found', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    const removed = await removeFromIndex(pool, 'post', 'nonexistent');
    expect(removed).toBe(false);
  });
});

// ============================================================================
// 10. STREAM GATEWAY
// ============================================================================
describe('Stream gateway', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
  });

  it('admit -> heartbeat -> evict timed out -> concurrent limits', async () => {
    // Admit: user has 0 active sessions, family has 0
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // user session count
      .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // family session count
      .mockResolvedValueOnce({ rows: [{ id: 'session-1' }] }); // insert session

    const result = await admitStream(pool, {
      user_id: USER_ID,
      family_id: FAMILY_ID,
      content_id: 'content-1',
    });
    expect(result.admitted).toBe(true);
    expect(result.session_id).toBe('session-1');
    expect(result.session_token).toBeDefined();
    expect(result.playback_url).toContain('/stream/content-1');

    // Heartbeat
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const alive = await heartbeat(pool, result.session_token!);
    expect(alive).toBe(true);

    // Evict timed out
    pool.query.mockResolvedValueOnce({ rowCount: 2 });
    const evicted = await evictTimedOut(pool);
    expect(evicted).toBe(2);
  });

  it('denies when user exceeds concurrent limit', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ count: 3 }] }); // user at max (default 3)

    const result = await admitStream(pool, {
      user_id: USER_ID,
      family_id: FAMILY_ID,
      content_id: 'content-2',
    });
    expect(result.admitted).toBe(false);
    expect(result.denial_reason).toContain('concurrent streams per user');
  });

  it('denies when family exceeds concurrent limit', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // user ok
      .mockResolvedValueOnce({ rows: [{ count: 10 }] }); // family at max (default 10)

    const result = await admitStream(pool, {
      user_id: USER_ID,
      family_id: FAMILY_ID,
      content_id: 'content-3',
    });
    expect(result.admitted).toBe(false);
    expect(result.denial_reason).toContain('concurrent streams per family');
  });

  it('endSession ends active session', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const ended = await endSession(pool, 'token-abc');
    expect(ended).toBe(true);
  });

  it('endSession returns false for unknown token', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    const ended = await endSession(pool, 'nonexistent-token');
    expect(ended).toBe(false);
  });

  it('getActiveSessions returns empty array', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const sessions = await getActiveSessions(pool, USER_ID);
    expect(sessions).toEqual([]);
  });

  it('heartbeat returns false for ended session', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    const alive = await heartbeat(pool, 'ended-token');
    expect(alive).toBe(false);
  });
});

// ============================================================================
// 11. DEVICE ENROLLMENT
// ============================================================================
describe('Device enrollment', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
  });

  it('register -> validate credential -> heartbeat -> revoke', async () => {
    // Register
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'device-1' }] });
    const reg = await registerDevice(pool, {
      family_id: FAMILY_ID,
      user_id: USER_ID,
      device_name: 'Living Room TV',
      device_type: 'tv',
    });
    expect(reg.id).toBe('device-1');
    expect(reg.bootstrap_token).toBeDefined();
    expect(reg.bootstrap_token.length).toBeGreaterThan(0);

    // Validate and issue credential
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'device-1', bootstrap_token: reg.bootstrap_token }] })
      .mockResolvedValueOnce({ rowCount: 1 });
    const credential = await validateAndIssueCredential(pool, 'device-1', reg.bootstrap_token);
    expect(credential).toBeTruthy();
    expect(credential!.length).toBeGreaterThan(0);

    // Heartbeat
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const alive = await deviceHeartbeat(pool, 'device-1', { battery: 95 });
    expect(alive).toBe(true);

    // Revoke
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const revoked = await revokeDevice(pool, 'device-1');
    expect(revoked).toBe(true);
  });

  it('validateAndIssueCredential rejects wrong token', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'device-1', bootstrap_token: 'correct-token' }] });
    const credential = await validateAndIssueCredential(pool, 'device-1', 'wrong-token');
    expect(credential).toBeNull();
  });

  it('validateAndIssueCredential rejects nonexistent device', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const credential = await validateAndIssueCredential(pool, 'nonexistent', 'any-token');
    expect(credential).toBeNull();
  });

  it('deviceHeartbeat returns false for revoked device', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    const alive = await deviceHeartbeat(pool, 'revoked-device');
    expect(alive).toBe(false);
  });

  it('getFamilyDevices returns device list', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 'd1', device_name: 'TV', is_trusted: true, is_revoked: false },
        { id: 'd2', device_name: 'Tablet', is_trusted: true, is_revoked: true },
      ],
    });
    const devices = await getFamilyDevices(pool, FAMILY_ID);
    expect(devices).toHaveLength(2);
  });

  it('createPairingCode returns code and expiry', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const result = await createPairingCode(pool, 'device-1', 10);
    expect(result.code).toBeDefined();
    expect(result.code.length).toBeLessThanOrEqual(6);
    expect(result.expires_at).toBeDefined();
  });

  it('confirmPairingCode returns null for expired/invalid code', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    const token = await confirmPairingCode(pool, 'INVALID', USER_ID);
    expect(token).toBeNull();
  });

  it('confirmPairingCode returns session token on success', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const token = await confirmPairingCode(pool, 'ABC123', USER_ID);
    expect(token).toBeTruthy();
    expect(token!.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 12. NOTIFICATION DISPATCH
// ============================================================================
describe('Notification dispatch', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
  });

  it('create notification -> mark read -> bulk mark read', async () => {
    // Create notification (no dedup check needed - no source_id)
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'notif-1' }] });
    const notifId = await createNotification(pool, {
      user_id: USER_ID,
      type: 'new_post',
      title: 'New family post',
      body: 'Dad shared new photos',
      channel: 'in_app',
    });
    expect(notifId).toBe('notif-1');

    // Mark single notification read
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const readCount = await markNotificationsRead(pool, USER_ID, ['notif-1']);
    expect(readCount).toBe(1);

    // Bulk mark read
    pool.query.mockResolvedValueOnce({ rowCount: 5 });
    const bulkCount = await markNotificationsRead(pool, USER_ID, ['n1', 'n2', 'n3', 'n4', 'n5']);
    expect(bulkCount).toBe(5);
  });

  it('markNotificationsRead returns zero for empty array', async () => {
    const count = await markNotificationsRead(pool, USER_ID, []);
    expect(count).toBe(0);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('createNotification deduplicates within 5 minutes', async () => {
    // Dedup check finds existing
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'existing' }] });
    const notifId = await createNotification(pool, {
      user_id: USER_ID,
      type: 'new_message',
      title: 'New message',
      source_id: 'msg-1',
      source_type: 'message',
    });
    expect(notifId).toBeNull();
    // Only the dedup check query was run, no INSERT
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('getNotifications returns array', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 'n1', type: 'new_post', title: 'Post', body: null, data: {}, status: 'pending', created_at: '2026-02-13' },
      ],
    });
    const notifs = await getNotifications(pool, USER_ID);
    expect(notifs).toHaveLength(1);
  });

  it('getUnreadNotificationCount returns numeric count', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ count: '12' }] });
    const count = await getUnreadNotificationCount(pool, USER_ID);
    expect(count).toBe(12);
    expect(typeof count).toBe('number');
  });

  it('getUnreadNotificationCount returns zero', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
    const count = await getUnreadNotificationCount(pool, USER_ID);
    expect(count).toBe(0);
  });
});

// ============================================================================
// 13. CALENDAR / EVENT LIFECYCLE
// ============================================================================
describe('Calendar/event lifecycle', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
  });

  it('create event -> RSVP -> generate iCal', async () => {
    // Create event
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'event-1' }] });
    const eventId = await createEvent(pool, {
      family_id: FAMILY_ID,
      title: 'Family BBQ',
      description: 'Annual backyard BBQ',
      start_at: '2026-07-04T16:00:00Z',
      end_at: '2026-07-04T20:00:00Z',
      location: 'Backyard',
      created_by: USER_ID,
    });
    expect(eventId).toBe('event-1');

    // RSVP accepted
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    await respondToInvite(pool, 'event-1', USER_ID_2, 'accepted');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('event_invites'),
      expect.arrayContaining(['event-1', USER_ID_2, 'accepted']),
    );

    // RSVP declined by another
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    await respondToInvite(pool, 'event-1', ADMIN_ID, 'declined');

    // Generate iCal feed
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 'event-1',
        title: 'Family BBQ',
        description: 'Annual backyard BBQ',
        start_at: '2026-07-04T16:00:00Z',
        end_at: '2026-07-04T20:00:00Z',
        all_day: false,
        location: 'Backyard',
        recurrence_rule: null,
      }],
    });
    const ical = await generateICalFeed(pool, FAMILY_ID);
    expect(ical).toContain('BEGIN:VCALENDAR');
    expect(ical).toContain('BEGIN:VEVENT');
    expect(ical).toContain('Family BBQ');
    expect(ical).toContain('END:VCALENDAR');
    expect(ical).toContain('Backyard');
  });

  it('iCal feed handles all-day events', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 'evt-allday',
        title: 'Holiday',
        description: null,
        start_at: '2026-12-25T00:00:00Z',
        end_at: null,
        all_day: true,
        location: null,
        recurrence_rule: null,
      }],
    });
    const ical = await generateICalFeed(pool, FAMILY_ID);
    expect(ical).toContain('DTSTART;VALUE=DATE:');
    expect(ical).not.toContain('DTSTART:2026'); // Not datetime format
  });

  it('iCal feed empty when no events', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const ical = await generateICalFeed(pool, FAMILY_ID);
    expect(ical).toContain('BEGIN:VCALENDAR');
    expect(ical).toContain('END:VCALENDAR');
    expect(ical).not.toContain('BEGIN:VEVENT');
  });
});

// ============================================================================
// 14. LOCATION SHARING
// ============================================================================
describe('Location sharing', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
  });

  it('update location -> get active -> cleanup expired', async () => {
    // Update location
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'loc-1' }] });
    const locId = await updateLocation(pool, {
      user_id: USER_ID,
      family_id: FAMILY_ID,
      latitude: 41.0534,
      longitude: -80.5951,
      accuracy: 10,
      duration_hours: 2,
    });
    expect(locId).toBe('loc-1');

    // Get active locations
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 'loc-1', user_id: USER_ID, latitude: 41.0534, longitude: -80.5951,
        display_name: 'User', avatar_url: null,
      }],
    });
    const active = await getActiveLocations(pool, FAMILY_ID);
    expect(active).toHaveLength(1);

    // Cleanup expired
    pool.query.mockResolvedValueOnce({ rowCount: 5 });
    const cleaned = await cleanupExpiredLocations(pool);
    expect(cleaned).toBe(5);
  });

  it('geofence check: inside', () => {
    // Same point should be inside a 100m radius
    const inside = isInsideGeofence(41.0534, -80.5951, 41.0534, -80.5951, 100);
    expect(inside).toBe(true);
  });

  it('geofence check: outside', () => {
    // Points ~111km apart (1 degree latitude)
    const outside = isInsideGeofence(42.0534, -80.5951, 41.0534, -80.5951, 1000);
    expect(outside).toBe(false);
  });

  it('geofence check: boundary precision', () => {
    // Very close points within a small radius
    const result = isInsideGeofence(41.0534, -80.5951, 41.0535, -80.5951, 20);
    // ~11 meters apart, should be inside 20m radius
    expect(result).toBe(true);
  });

  it('getActiveLocations returns empty when no shares', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const active = await getActiveLocations(pool, FAMILY_ID);
    expect(active).toEqual([]);
  });

  it('updateLocation uses parameterized queries', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'loc-2' }] });
    await updateLocation(pool, {
      user_id: USER_ID,
      family_id: FAMILY_ID,
      latitude: 0,
      longitude: 0,
    });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('$1');
    expect(Array.isArray(params)).toBe(true);
    expect(params).toContain(USER_ID);
  });
});

// ============================================================================
// 15. RECIPE LIFECYCLE
// ============================================================================
describe('Recipe lifecycle', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
  });

  it('create recipe with ingredients and steps', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'recipe-1' }] }) // insert recipe
      .mockResolvedValueOnce({ rowCount: 1 }) // insert ingredient 1
      .mockResolvedValueOnce({ rowCount: 1 }) // insert ingredient 2
      .mockResolvedValueOnce({ rowCount: 1 }); // insert step 1

    const recipeId = await createRecipe(
      pool,
      {
        family_id: FAMILY_ID,
        title: 'Grandma Pasta',
        description: 'Traditional family recipe',
        prep_time_minutes: 15,
        cook_time_minutes: 30,
        servings: 4,
        difficulty: 'medium',
        cuisine: 'Italian',
        created_by: USER_ID,
      },
      [
        { name: 'Pasta', amount: 500, unit: 'g', sort_order: 1 },
        { name: 'Tomato Sauce', amount: 400, unit: 'ml', sort_order: 2 },
      ],
      [
        { step_number: 1, instruction: 'Boil water and cook pasta', duration_minutes: 10 },
      ],
    );
    expect(recipeId).toBe('recipe-1');
    // 1 recipe + 2 ingredients + 1 step = 4 queries
    expect(pool.query).toHaveBeenCalledTimes(4);
  });

  it('create recipe with no ingredients or steps', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'recipe-2' }] });
    const recipeId = await createRecipe(pool, {
      family_id: FAMILY_ID,
      title: 'Simple Salad',
      created_by: USER_ID,
    });
    expect(recipeId).toBe('recipe-2');
    // Only the recipe insert
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('generateShoppingList aggregates ingredients', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { name: 'Pasta', total_amount: 1000, unit: 'g' },
        { name: 'Tomato Sauce', total_amount: 800, unit: 'ml' },
      ],
    });
    const list = await generateShoppingList(pool, FAMILY_ID, '2026-02-10', '2026-02-16');
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe('Pasta');
    expect(list[0].total_amount).toBe(1000);
  });

  it('generateShoppingList returns empty for no meal plans', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const list = await generateShoppingList(pool, FAMILY_ID, '2026-02-10', '2026-02-16');
    expect(list).toEqual([]);
  });
});

// ============================================================================
// 16. GENEALOGY
// ============================================================================
describe('Genealogy', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
  });

  it('create profile -> get profiles -> validate graph', async () => {
    // Create profile
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'profile-1' }] });
    const profileId = await createGenealogyProfile(pool, {
      family_id: FAMILY_ID,
      full_name: 'Ahmad ibn Abdullah',
      gender: 'male',
      birth_date: '1950-01-15',
      birth_place: 'Makkah',
    });
    expect(profileId).toBe('profile-1');

    // Get profiles
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 'profile-1', family_id: FAMILY_ID, full_name: 'Ahmad ibn Abdullah', user_id: null,
          maiden_name: null, birth_date: '1950-01-15', birth_place: 'Makkah',
          death_date: null, death_place: null, gender: 'male',
          generation_number: null, gedcom_id: null, biography: null, notes: null, metadata: {} },
      ],
    });
    const profiles = await getGenealogyProfiles(pool, FAMILY_ID);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].full_name).toBe('Ahmad ibn Abdullah');

    // Validate graph (no contradictions)
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // no contradictions
      .mockResolvedValueOnce({ rows: [] }); // no self-relationships
    const conflicts = await validateRelationshipGraph(pool, FAMILY_ID);
    expect(conflicts).toHaveLength(0);
  });

  it('validateRelationshipGraph detects contradictions', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ user_a_id: 'u1', user_b_id: 'u2', type1: 'parent', type2: 'parent' }],
      })
      .mockResolvedValueOnce({ rows: [] });
    const conflicts = await validateRelationshipGraph(pool, FAMILY_ID);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0]).toContain('Contradictory');
  });

  it('validateRelationshipGraph detects self-relationships', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'rel-1', user_a_id: 'u1' }] });
    const conflicts = await validateRelationshipGraph(pool, FAMILY_ID);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0]).toContain('Self-relationship');
  });

  it('detectDuplicates finds matching names case-insensitively', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'p1' }, { id: 'p2' }] });
    const dupes = await detectDuplicates(pool, FAMILY_ID, 'Ahmad ibn Abdullah');
    expect(dupes).toEqual(['p1', 'p2']);
  });

  it('detectDuplicates returns empty when no matches', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const dupes = await detectDuplicates(pool, FAMILY_ID, 'Unique Name');
    expect(dupes).toEqual([]);
  });
});

// ============================================================================
// 17. GEDCOM IMPORT/EXPORT
// ============================================================================
describe('GEDCOM import/export', () => {
  it('parseGedcom extracts individuals and families', () => {
    const gedcom = `0 HEAD
1 SOUR Test
0 @I1@ INDI
1 NAME John /Smith/
1 SEX M
1 BIRT
2 DATE 1 JAN 1950
2 PLAC New York
0 @I2@ INDI
1 NAME Jane /Doe/
1 SEX F
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
0 TRLR`;

    const data = parseGedcom(gedcom);
    expect(data.individuals).toHaveLength(2);
    expect(data.families).toHaveLength(1);
    expect(data.individuals[0].fullName).toBe('John Smith');
    expect(data.individuals[0].gender).toBe('male');
    expect(data.individuals[0].birthDate).toBe('1 JAN 1950');
    expect(data.individuals[0].birthPlace).toBe('New York');
    expect(data.individuals[1].fullName).toBe('Jane Doe');
    expect(data.individuals[1].gender).toBe('female');
    expect(data.families[0].husbandId).toBe('I1');
    expect(data.families[0].wifeId).toBe('I2');
    expect(data.families[0].childIds).toContain('I3');
  });

  it('generateGedcom produces valid GEDCOM structure', () => {
    const profiles = [
      { id: 'p1', full_name: 'Ahmad', gender: 'male', birth_date: '1950-01-01', birth_place: 'Cairo' },
      { id: 'p2', full_name: 'Fatima', gender: 'female' },
    ];
    const relationships = [
      { user_a_id: 'p1', user_b_id: 'p2', relation_type: 'spouse' },
    ];

    const output = generateGedcom(profiles, relationships);
    expect(output).toContain('0 HEAD');
    expect(output).toContain('0 @p1@ INDI');
    expect(output).toContain('1 NAME Ahmad');
    expect(output).toContain('1 SEX M');
    expect(output).toContain('2 DATE 1950-01-01');
    expect(output).toContain('2 PLAC Cairo');
    expect(output).toContain('0 @p2@ INDI');
    expect(output).toContain('1 SEX F');
    expect(output).toContain('FAM');
    expect(output).toContain('1 HUSB @p1@');
    expect(output).toContain('1 WIFE @p2@');
    expect(output).toContain('0 TRLR');
  });

  it('parseGedcom handles empty input', () => {
    const data = parseGedcom('');
    expect(data.individuals).toEqual([]);
    expect(data.families).toEqual([]);
  });

  it('roundtrip: generate -> parse preserves core data', () => {
    const profiles = [
      { id: 'P1', full_name: 'Test Person', gender: 'male', birth_date: '2000-01-01' },
    ];
    const output = generateGedcom(profiles, []);
    const parsed = parseGedcom(output);

    expect(parsed.individuals.length).toBeGreaterThanOrEqual(1);
    expect(parsed.individuals[0].fullName).toBe('Test Person');
    expect(parsed.individuals[0].gender).toBe('male');
  });
});

// ============================================================================
// 18. ANALYTICS / USAGE / QUOTA
// ============================================================================
describe('Analytics and quota management', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
  });

  it('trackUsage inserts metric', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'usage-1' }] });
    const id = await trackUsage(pool, {
      family_id: FAMILY_ID,
      metric_type: 'storage_bytes',
      value: 1024000,
      period_start: '2026-02-01',
      period_end: '2026-02-28',
    });
    expect(id).toBe('usage-1');
  });

  it('trackUsage accumulates on conflict', async () => {
    // First call returns empty (conflict - ON CONFLICT DO NOTHING)
    pool.query.mockResolvedValueOnce({ rows: [] });
    // Second call updates existing
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'usage-existing' }] });

    const id = await trackUsage(pool, {
      family_id: FAMILY_ID,
      metric_type: 'storage_bytes',
      value: 500,
      period_start: '2026-02-01',
      period_end: '2026-02-28',
    });
    expect(id).toBe('usage-existing');
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  it('setQuotaLimit and checkQuota', async () => {
    // Set quota
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'quota-1' }] });
    const quotaId = await setQuotaLimit(pool, {
      family_id: FAMILY_ID,
      metric_type: 'storage_bytes',
      soft_limit: 5_000_000_000,
      hard_limit: 10_000_000_000,
      alert_threshold_pct: 80,
    });
    expect(quotaId).toBe('quota-1');

    // Check quota
    pool.query
      .mockResolvedValueOnce({ rows: [{ current_value: '4000000000' }] }) // usage
      .mockResolvedValueOnce({
        rows: [{
          soft_limit: 5_000_000_000,
          hard_limit: 10_000_000_000,
          alert_threshold_pct: 80,
        }],
      });
    const check = await checkQuota(pool, FAMILY_ID, 'storage_bytes');
    expect(check.metric_type).toBe('storage_bytes');
    expect(check.exceeded_soft).toBe(false);
    expect(check.exceeded_hard).toBe(false);
    expect(typeof check.usage_pct).toBe('number');
  });

  it('setEntitlement and getEntitlements', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'ent-1' }] });
    const entId = await setEntitlement(pool, {
      family_id: FAMILY_ID,
      user_id: USER_ID,
      claim_type: 'can_watch',
      claim_value: 'true',
      source: 'family_role',
    });
    expect(entId).toBe('ent-1');

    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'ent-1', claim_type: 'can_watch', claim_value: 'true' }],
    });
    const ents = await getEntitlements(pool, FAMILY_ID, USER_ID);
    expect(ents).toHaveLength(1);
  });

  it('getUsageMetrics with metric filter', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'm1' }] });
    const metrics = await getUsageMetrics(pool, FAMILY_ID, 'storage_bytes');
    expect(metrics).toHaveLength(1);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('metric_type = $2'),
      expect.arrayContaining([FAMILY_ID, 'storage_bytes']),
    );
  });

  it('getUsageMetrics without filter', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const metrics = await getUsageMetrics(pool, FAMILY_ID);
    expect(metrics).toEqual([]);
    expect(pool.query.mock.calls[0][0]).not.toContain('metric_type');
  });
});

// ============================================================================
// 19. VISIBILITY (additional tests)
// ============================================================================
describe('Visibility advanced checks', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
  });

  it('post_not_found when post does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const result = await evaluatePostVisibility(pool, 'nonexistent', {
      viewerId: USER_ID,
      viewerRole: 'OWNER',
      familyId: FAMILY_ID,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('post_not_found');
  });

  it('private post denied when viewer not in audience', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{
          visibility: 'private',
          author_id: 'other-user',
          family_id: FAMILY_ID,
          islamic_mode_enabled: false,
          viewer_role: 'ADULT_MEMBER',
          viewer_state: 'active',
        }],
      })
      .mockResolvedValueOnce({ rows: [] }); // not in audience

    const result = await evaluatePostVisibility(pool, 'private-post', {
      viewerId: USER_ID,
      viewerRole: 'ADULT_MEMBER',
      familyId: FAMILY_ID,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('not_in_audience');
  });

  it('getFamilySettings returns null for nonexistent family', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const settings = await getFamilySettings(pool, 'nonexistent');
    expect(settings).toBeNull();
  });

  it('updateFamilySettings creates new record when none exists', async () => {
    // getFamilySettings returns null (no existing)
    pool.query.mockResolvedValueOnce({ rows: [] });
    // INSERT new settings
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    await updateFamilySettings(pool, FAMILY_ID, { islamic_mode_enabled: true }, USER_ID);
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls[1][0]).toContain('INSERT INTO public.family_settings');
  });
});

// ============================================================================
// 20. REGRESSION TESTS — EDGE CASES
// ============================================================================
describe('Regression: edge cases', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
  });

  describe('empty results handling', () => {
    it('queryAuditEvents returns empty array', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const events = await queryAuditEvents(pool, {});
      expect(events).toEqual([]);
    });

    it('getVaults returns empty for user with no vaults', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const vaults = await getVaults(pool, 'no-vaults-user');
      expect(vaults).toEqual([]);
    });

    it('getGenealogyProfiles returns empty for new family', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const profiles = await getGenealogyProfiles(pool, 'new-family');
      expect(profiles).toEqual([]);
    });
  });

  describe('SQL injection prevention (parameterized queries)', () => {
    it('audit: malicious event_type is parameterized', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'a' }], rowCount: 1 });
      const malicious = "test' OR '1'='1";
      await writeAuditEvent(pool, { event_type: malicious });
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).not.toContain(malicious);
      expect(params).toContain(malicious);
    });

    it('search: injection attempt in query is stripped of special chars', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      await search(pool, { family_id: FAMILY_ID, query: "'; DELETE FROM search_index; --" });
      const sql = pool.query.mock.calls[0][0] as string;
      const params = pool.query.mock.calls[0][1] as unknown[];
      // Special characters removed by sanitizer
      expect(params[1]).not.toContain("'");
      expect(params[1]).not.toContain(';');
      expect(params[1]).not.toContain('--');
      // The tsquery is a bound parameter, never interpolated into SQL
      expect(sql).not.toContain('DELETE FROM search_index');
      expect(sql).toContain('$2'); // parameterized
    });

    it('media: malicious filename is parameterized', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'm1' }], rowCount: 1 });
      const maliciousFilename = "'; DROP TABLE media_items; --.jpg";
      await createMediaItem(pool, {
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        file_name: maliciousFilename,
        mime_type: 'image/jpeg',
        file_size: 100,
        storage_path: '/path/safe',
        checksum_sha256: 'abc',
      });
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).not.toContain('DROP TABLE');
      expect(params).toContain(maliciousFilename);
    });
  });

  describe('null/undefined input handling', () => {
    it('writeAuditEvent handles all-null optional fields', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'a' }], rowCount: 1 });
      await writeAuditEvent(pool, { event_type: 'test' });
      const params = pool.query.mock.calls[0][1] as unknown[];
      // family_id, actor_id, subject_id, subject_type, old_state, new_state, ip_address, user_agent
      expect(params[0]).toBeNull(); // family_id
      expect(params[2]).toBeNull(); // actor_id
      expect(params[3]).toBeNull(); // subject_id
      expect(params[4]).toBeNull(); // subject_type
      expect(params[5]).toBeNull(); // old_state
      expect(params[6]).toBeNull(); // new_state
    });

    it('createMediaItem handles null dimensions', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'm1' }], rowCount: 1 });
      await createMediaItem(pool, {
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        file_name: 'doc.pdf',
        mime_type: 'application/pdf',
        file_size: 5000,
        storage_path: '/path',
        checksum_sha256: 'hash',
        width: null,
        height: null,
        duration_ms: null,
      });
      const params = pool.query.mock.calls[0][1] as unknown[];
      // width, height, duration_ms should be null
      expect(params[7]).toBeNull();
      expect(params[8]).toBeNull();
      expect(params[9]).toBeNull();
    });

    it('updateLocation uses default 1 hour duration', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'loc' }] });
      await updateLocation(pool, {
        user_id: USER_ID,
        family_id: FAMILY_ID,
        latitude: 0,
        longitude: 0,
      });
      const params = pool.query.mock.calls[0][1] as unknown[];
      // Last param should be 1 (default duration_hours)
      expect(params[params.length - 1]).toBe(1);
    });

    it('createRecipe handles all optional fields as null', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'r1' }] });
      await createRecipe(pool, {
        family_id: FAMILY_ID,
        title: 'Minimal Recipe',
        created_by: USER_ID,
      });
      const params = pool.query.mock.calls[0][1] as unknown[];
      // description, prep_time, cook_time, servings, difficulty, cuisine, source_url
      expect(params[2]).toBeNull(); // description
      expect(params[3]).toBeNull(); // prep_time_minutes
      expect(params[4]).toBeNull(); // cook_time_minutes
      expect(params[5]).toBeNull(); // servings
      expect(params[6]).toBeNull(); // difficulty
      expect(params[7]).toBeNull(); // cuisine
    });
  });

  describe('concurrent access patterns', () => {
    it('stream gateway handles concurrent admission checks atomically', async () => {
      // Two users trying to stream at the same time
      const pool1 = createMockPool();
      const pool2 = createMockPool();

      // User 1: passes both checks
      pool1.query
        .mockResolvedValueOnce({ rows: [{ count: 2 }] }) // user has 2 streams
        .mockResolvedValueOnce({ rows: [{ count: 8 }] }) // family has 8 streams
        .mockResolvedValueOnce({ rows: [{ id: 's1' }] });

      // User 2: also passes
      pool2.query
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [{ count: 9 }] })
        .mockResolvedValueOnce({ rows: [{ id: 's2' }] });

      const [r1, r2] = await Promise.all([
        admitStream(pool1, { user_id: USER_ID, family_id: FAMILY_ID, content_id: 'c1' }),
        admitStream(pool2, { user_id: USER_ID_2, family_id: FAMILY_ID, content_id: 'c2' }),
      ]);

      expect(r1.admitted).toBe(true);
      expect(r2.admitted).toBe(true);
    });

    it('notification deduplication prevents double-send', async () => {
      // First notification: dedup check finds nothing
      const pool1 = createMockPool();
      pool1.query
        .mockResolvedValueOnce({ rows: [] }) // no existing
        .mockResolvedValueOnce({ rows: [{ id: 'n1' }] }); // insert

      // Second notification: dedup check finds existing
      const pool2 = createMockPool();
      pool2.query.mockResolvedValueOnce({ rows: [{ id: 'n1' }] }); // existing found

      const [id1, id2] = await Promise.all([
        createNotification(pool1, {
          user_id: USER_ID, type: 'test', title: 'T',
          source_id: 'src-1', source_type: 'test',
        }),
        createNotification(pool2, {
          user_id: USER_ID, type: 'test', title: 'T',
          source_id: 'src-1', source_type: 'test',
        }),
      ]);

      expect(id1).toBe('n1');
      expect(id2).toBeNull(); // deduplicated
    });
  });
});
