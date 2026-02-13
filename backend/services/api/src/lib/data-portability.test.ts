import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportFamilyData,
  importFamilyData,
  deleteFamilyData,
  verifyDataIntegrity,
  getDataSummary,
} from './data-portability';
import type { FamilyExportData } from './data-portability';

const FAMILY_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID_1 = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID_2 = '550e8400-e29b-41d4-a716-446655440002';

function createMockClient(queryResults: Array<{ rows: unknown[]; rowCount?: number }> = []) {
  let callIndex = 0;
  const defaultResult = { rows: [], rowCount: 0 };
  return {
    query: vi.fn().mockImplementation(() => {
      const result = queryResults[callIndex] ?? defaultResult;
      callIndex++;
      return Promise.resolve(result);
    }),
    release: vi.fn(),
  };
}

function createMockPool(overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: vi.fn(),
    }),
    ...overrides,
  } as any;
}

function buildExportData(overrides: Partial<FamilyExportData> = {}): FamilyExportData {
  return {
    version: '1.0',
    exported_at: '2026-01-15T00:00:00.000Z',
    family: { id: FAMILY_ID, name: 'Test Family', created_at: '2026-01-01T00:00:00.000Z' },
    members: [],
    posts: [],
    media_items: [],
    events: [],
    recipes: [],
    conversations: [],
    messages: [],
    vaults: [],
    vault_items: [],
    relationships: [],
    audit_events: [],
    ...overrides,
  };
}

describe('data-portability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==============================================================
  // exportFamilyData
  // ==============================================================
  describe('exportFamilyData', () => {
    it('exports all data types for a family', async () => {
      const familyRow = { id: FAMILY_ID, name: 'The Smiths' };
      const memberRows = [{ id: USER_ID_1, display_name: 'Alice', role: 'owner', joined_at: '2026-01-01' }];
      const postRows = [{ id: 'post-1', content: 'Hello family!' }];
      const mediaRows = [{ id: 'media-1', file_name: 'photo.jpg', variants: null }];
      const eventRows = [{ id: 'event-1', title: 'Birthday' }];
      const recipeRows = [{ id: 'recipe-1', title: 'Pasta' }];
      const convRows = [{ id: 'conv-1', type: 'group' }];
      const msgRows = [{ id: 'msg-1', content: 'Hi!' }];
      const vaultRows = [{ id: 'vault-1', title: 'Legacy' }];
      const vaultItemRows = [{ id: 'vi-1', vault_id: 'vault-1' }];
      const relRows = [{ id: 'rel-1', from_user_id: USER_ID_1, to_user_id: USER_ID_2 }];
      const auditRows = [{ id: 'audit-1', event_type: 'user.login' }];

      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [familyRow] })       // families
          .mockResolvedValueOnce({ rows: memberRows })         // family_members + users
          .mockResolvedValueOnce({ rows: postRows })           // posts
          .mockResolvedValueOnce({ rows: mediaRows })          // media_items + variants
          .mockResolvedValueOnce({ rows: eventRows })          // events
          .mockResolvedValueOnce({ rows: recipeRows })         // recipes
          .mockResolvedValueOnce({ rows: convRows })           // conversations
          .mockResolvedValueOnce({ rows: msgRows })            // messages
          .mockResolvedValueOnce({ rows: vaultRows })          // legacy_vaults
          .mockResolvedValueOnce({ rows: vaultItemRows })      // vault_items
          .mockResolvedValueOnce({ rows: relRows })            // relationships
          .mockResolvedValueOnce({ rows: auditRows }),         // audit_events
      });

      const result = await exportFamilyData(pool, FAMILY_ID);

      expect(result.version).toBe('1.0');
      expect(result.exported_at).toBeDefined();
      expect(result.family).toEqual(familyRow);
      expect(result.members).toEqual(memberRows);
      expect(result.posts).toEqual(postRows);
      expect(result.media_items).toEqual(mediaRows);
      expect(result.events).toEqual(eventRows);
      expect(result.recipes).toEqual(recipeRows);
      expect(result.conversations).toEqual(convRows);
      expect(result.messages).toEqual(msgRows);
      expect(result.vaults).toEqual(vaultRows);
      expect(result.vault_items).toEqual(vaultItemRows);
      expect(result.relationships).toEqual(relRows);
      expect(result.audit_events).toEqual(auditRows);
    });

    it('throws when family not found', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [] }),
      });

      await expect(exportFamilyData(pool, 'nonexistent'))
        .rejects.toThrow('Family not found: nonexistent');
    });

    it('handles family with no conversations (skips messages query)', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: FAMILY_ID, name: 'Empty' }] }) // families
          .mockResolvedValueOnce({ rows: [] })                                  // members
          .mockResolvedValueOnce({ rows: [] })                                  // posts
          .mockResolvedValueOnce({ rows: [] })                                  // media
          .mockResolvedValueOnce({ rows: [] })                                  // events
          .mockResolvedValueOnce({ rows: [] })                                  // recipes
          .mockResolvedValueOnce({ rows: [] })                                  // conversations (empty)
          // messages query should be skipped since no conversation IDs
          .mockResolvedValueOnce({ rows: [] })                                  // vaults
          // vault items query should be skipped since no vault IDs
          .mockResolvedValueOnce({ rows: [] })                                  // relationships
          .mockResolvedValueOnce({ rows: [] }),                                 // audit
      });

      const result = await exportFamilyData(pool, FAMILY_ID);

      expect(result.conversations).toEqual([]);
      expect(result.messages).toEqual([]);
      expect(result.vaults).toEqual([]);
      expect(result.vault_items).toEqual([]);
    });

    it('returns empty arrays for family with no data', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: FAMILY_ID, name: 'Empty Family' }] })
          .mockResolvedValueOnce({ rows: [] }) // members
          .mockResolvedValueOnce({ rows: [] }) // posts
          .mockResolvedValueOnce({ rows: [] }) // media
          .mockResolvedValueOnce({ rows: [] }) // events
          .mockResolvedValueOnce({ rows: [] }) // recipes
          .mockResolvedValueOnce({ rows: [] }) // conversations
          .mockResolvedValueOnce({ rows: [] }) // vaults
          .mockResolvedValueOnce({ rows: [] }) // relationships
          .mockResolvedValueOnce({ rows: [] }), // audit
      });

      const result = await exportFamilyData(pool, FAMILY_ID);

      expect(result.members).toHaveLength(0);
      expect(result.posts).toHaveLength(0);
      expect(result.media_items).toHaveLength(0);
      expect(result.events).toHaveLength(0);
      expect(result.recipes).toHaveLength(0);
    });
  });

  // ==============================================================
  // importFamilyData
  // ==============================================================
  describe('importFamilyData', () => {
    it('imports data and creates a new family with remapped IDs', async () => {
      const client = createMockClient();
      const pool = createMockPool({
        connect: vi.fn().mockResolvedValue(client),
      });

      const data = buildExportData({
        members: [{ id: USER_ID_1, email: 'alice@test.com', display_name: 'Alice', role: 'owner' }],
        posts: [{ id: 'post-1', author_id: USER_ID_1, content: 'Hello' }],
      });

      const result = await importFamilyData(pool, data);

      expect(result.family_id).toBeDefined();
      expect(result.family_id).not.toBe(FAMILY_ID); // Should be remapped
      expect(result.counts.members).toBe(1);
      expect(result.counts.posts).toBe(1);
      expect(result.id_mapping[FAMILY_ID]).toBe(result.family_id);
      expect(result.id_mapping[USER_ID_1]).toBeDefined();
      expect(result.id_mapping['post-1']).toBeDefined();
      // Verify BEGIN and COMMIT were called
      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();
    });

    it('imports into existing family when targetFamilyId is provided', async () => {
      const existingFamilyId = '99999999-9999-9999-9999-999999999999';
      const client = createMockClient();
      const pool = createMockPool({
        connect: vi.fn().mockResolvedValue(client),
      });

      const data = buildExportData({
        members: [{ id: USER_ID_1, email: 'alice@test.com', display_name: 'Alice' }],
      });

      const result = await importFamilyData(pool, data, existingFamilyId);

      expect(result.family_id).toBe(existingFamilyId);
      expect(result.id_mapping[FAMILY_ID]).toBe(existingFamilyId);
      // Should NOT have inserted a family record (no INSERT INTO families call after BEGIN)
      const queryCalls = client.query.mock.calls.map((c: unknown[]) => c[0]);
      const familyInserts = queryCalls.filter(
        (sql: string) => typeof sql === 'string' && sql.includes('INSERT INTO public.families'),
      );
      expect(familyInserts).toHaveLength(0);
    });

    it('remaps IDs for all entity types preserving relationships', async () => {
      const client = createMockClient();
      const pool = createMockPool({
        connect: vi.fn().mockResolvedValue(client),
      });

      const data = buildExportData({
        members: [
          { id: USER_ID_1, email: 'a@test.com', display_name: 'A' },
          { id: USER_ID_2, email: 'b@test.com', display_name: 'B' },
        ],
        conversations: [{ id: 'conv-1', type: 'direct', created_by: USER_ID_1 }],
        messages: [
          { id: 'msg-1', conversation_id: 'conv-1', sender_id: USER_ID_1, content: 'Hi' },
          { id: 'msg-2', conversation_id: 'conv-1', sender_id: USER_ID_2, content: 'Hello', reply_to_id: 'msg-1' },
        ],
        vaults: [{ id: 'vault-1', owner_id: USER_ID_1, title: 'Legacy' }],
        vault_items: [{ id: 'vi-1', vault_id: 'vault-1', content_type: 'letter' }],
        relationships: [{ id: 'rel-1', from_user_id: USER_ID_1, to_user_id: USER_ID_2, relationship_type: 'parent' }],
      });

      const result = await importFamilyData(pool, data);

      // Verify conversation's created_by was remapped
      const convInsert = client.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO public.conversations'),
      );
      expect(convInsert).toBeDefined();
      const convParams = convInsert![1] as string[];
      expect(convParams[4]).toBe(result.id_mapping[USER_ID_1]); // created_by remapped

      // Verify message reply_to_id was remapped
      const msgInserts = client.query.mock.calls.filter(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO public.messages'),
      );
      expect(msgInserts).toHaveLength(2);
      const replyMsg = msgInserts[1][1] as unknown[];
      expect(replyMsg[5]).toBe(result.id_mapping['msg-1']); // reply_to_id remapped

      // Verify vault item's vault_id was remapped
      const viInsert = client.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO public.vault_items'),
      );
      expect(viInsert).toBeDefined();
      const viParams = viInsert![1] as string[];
      expect(viParams[1]).toBe(result.id_mapping['vault-1']); // vault_id remapped

      // Verify relationship user IDs were remapped
      const relInsert = client.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO public.relationships'),
      );
      expect(relInsert).toBeDefined();
      const relParams = relInsert![1] as string[];
      expect(relParams[2]).toBe(result.id_mapping[USER_ID_1]); // from_user_id
      expect(relParams[3]).toBe(result.id_mapping[USER_ID_2]); // to_user_id

      expect(result.counts.conversations).toBe(1);
      expect(result.counts.messages).toBe(2);
      expect(result.counts.vaults).toBe(1);
      expect(result.counts.vault_items).toBe(1);
      expect(result.counts.relationships).toBe(1);
    });

    it('imports empty dataset without errors', async () => {
      const client = createMockClient();
      const pool = createMockPool({
        connect: vi.fn().mockResolvedValue(client),
      });

      const data = buildExportData();
      const result = await importFamilyData(pool, data);

      expect(result.counts.members).toBe(0);
      expect(result.counts.posts).toBe(0);
      expect(Object.keys(result.id_mapping)).toHaveLength(1); // only family ID
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('rolls back on database error', async () => {
      const client = {
        query: vi.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({}) // INSERT family
          .mockRejectedValueOnce(new Error('Constraint violation')) // INSERT user fails
          .mockResolvedValueOnce({}), // ROLLBACK
        release: vi.fn(),
      };
      const pool = createMockPool({
        connect: vi.fn().mockResolvedValue(client),
      });

      const data = buildExportData({
        members: [{ id: USER_ID_1, email: 'test@test.com', display_name: 'Test' }],
      });

      await expect(importFamilyData(pool, data)).rejects.toThrow('Constraint violation');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });

    it('imports media items with remapped uploader IDs', async () => {
      const client = createMockClient();
      const pool = createMockPool({
        connect: vi.fn().mockResolvedValue(client),
      });

      const data = buildExportData({
        members: [{ id: USER_ID_1, email: 'a@test.com', display_name: 'A' }],
        media_items: [{
          id: 'media-1', uploaded_by: USER_ID_1, file_name: 'photo.jpg',
          mime_type: 'image/jpeg', file_size: 1024, storage_path: '/photos/1.jpg',
          checksum_sha256: 'abc123',
        }],
      });

      const result = await importFamilyData(pool, data);

      expect(result.counts.media_items).toBe(1);
      const mediaInsert = client.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO public.media_items'),
      );
      expect(mediaInsert).toBeDefined();
      const mediaParams = mediaInsert![1] as string[];
      expect(mediaParams[2]).toBe(result.id_mapping[USER_ID_1]); // uploaded_by remapped
    });

    it('imports events and recipes with remapped creator IDs', async () => {
      const client = createMockClient();
      const pool = createMockPool({
        connect: vi.fn().mockResolvedValue(client),
      });

      const data = buildExportData({
        members: [{ id: USER_ID_1, email: 'a@test.com', display_name: 'A' }],
        events: [{ id: 'event-1', title: 'Birthday', start_time: '2026-06-15T10:00:00Z', created_by: USER_ID_1 }],
        recipes: [{ id: 'recipe-1', title: 'Pasta', created_by: USER_ID_1 }],
      });

      const result = await importFamilyData(pool, data);

      expect(result.counts.events).toBe(1);
      expect(result.counts.recipes).toBe(1);
    });
  });

  // ==============================================================
  // deleteFamilyData
  // ==============================================================
  describe('deleteFamilyData', () => {
    it('deletes all data in correct foreign key order', async () => {
      const client = {
        query: vi.fn()
          .mockResolvedValueOnce({})                              // BEGIN
          .mockResolvedValueOnce({ rowCount: 5 })                 // messages
          .mockResolvedValueOnce({ rowCount: 2 })                 // conversations
          .mockResolvedValueOnce({ rowCount: 3 })                 // vault_items
          .mockResolvedValueOnce({ rowCount: 1 })                 // vaults
          .mockResolvedValueOnce({ rowCount: 4 })                 // events
          .mockResolvedValueOnce({ rowCount: 2 })                 // recipes
          .mockResolvedValueOnce({ rowCount: 1 })                 // media_variants
          .mockResolvedValueOnce({ rowCount: 3 })                 // media_items
          .mockResolvedValueOnce({ rowCount: 6 })                 // posts
          .mockResolvedValueOnce({ rowCount: 2 })                 // relationships
          .mockResolvedValueOnce({ rowCount: 4 })                 // family_members
          .mockResolvedValueOnce({ rowCount: 10 })                // audit_events
          .mockResolvedValueOnce({ rowCount: 1 })                 // families
          .mockResolvedValueOnce({}),                             // COMMIT
        release: vi.fn(),
      };
      const pool = createMockPool({
        connect: vi.fn().mockResolvedValue(client),
      });

      const result = await deleteFamilyData(pool, FAMILY_ID);

      expect(result.family_id).toBe(FAMILY_ID);
      expect(result.completed_at).toBeDefined();
      expect(result.counts.messages).toBe(5);
      expect(result.counts.conversations).toBe(2);
      expect(result.counts.vault_items).toBe(3);
      expect(result.counts.vaults).toBe(1);
      expect(result.counts.events).toBe(4);
      expect(result.counts.recipes).toBe(2);
      expect(result.counts.media_variants).toBe(1);
      expect(result.counts.media_items).toBe(3);
      expect(result.counts.posts).toBe(6);
      expect(result.counts.relationships).toBe(2);
      expect(result.counts.family_members).toBe(4);
      expect(result.counts.audit_events).toBe(10);
      expect(result.counts.families).toBe(1);

      // Verify deletion order: messages before conversations, vault_items before vaults, etc.
      // Use DELETE FROM <table> to match the direct target (not subqueries)
      const deleteCalls = client.query.mock.calls
        .filter((c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('DELETE'))
        .map((c: unknown[]) => c[0] as string);

      const messagesIdx = deleteCalls.findIndex((s: string) => s.includes('DELETE FROM public.messages'));
      const conversationsIdx = deleteCalls.findIndex((s: string) => s.includes('DELETE FROM public.conversations'));
      const vaultItemsIdx = deleteCalls.findIndex((s: string) => s.includes('DELETE FROM public.vault_items'));
      const vaultsIdx = deleteCalls.findIndex((s: string) => s.includes('DELETE FROM public.legacy_vaults'));
      const variantsIdx = deleteCalls.findIndex((s: string) => s.includes('DELETE FROM public.media_variants'));
      const mediaIdx = deleteCalls.findIndex((s: string) => s.includes('DELETE FROM public.media_items'));
      const familyMembersIdx = deleteCalls.findIndex((s: string) => s.includes('DELETE FROM public.family_members'));
      const familiesIdx = deleteCalls.findIndex((s: string) => s.includes('DELETE FROM public.families'));

      expect(messagesIdx).toBeLessThan(conversationsIdx);
      expect(vaultItemsIdx).toBeLessThan(vaultsIdx);
      expect(variantsIdx).toBeLessThan(mediaIdx);
      expect(familyMembersIdx).toBeLessThan(familiesIdx);
    });

    it('uses a transaction with BEGIN and COMMIT', async () => {
      const client = {
        query: vi.fn().mockResolvedValue({ rowCount: 0 }),
        release: vi.fn(),
      };
      const pool = createMockPool({
        connect: vi.fn().mockResolvedValue(client),
      });

      await deleteFamilyData(pool, FAMILY_ID);

      const calls = client.query.mock.calls.map((c: unknown[]) => c[0]);
      expect(calls[0]).toBe('BEGIN');
      expect(calls[calls.length - 1]).toBe('COMMIT');
    });

    it('rolls back on error during deletion', async () => {
      const client = {
        query: vi.fn()
          .mockResolvedValueOnce({})                          // BEGIN
          .mockResolvedValueOnce({ rowCount: 3 })             // messages
          .mockRejectedValueOnce(new Error('FK violation'))   // conversations fails
          .mockResolvedValueOnce({}),                         // ROLLBACK
        release: vi.fn(),
      };
      const pool = createMockPool({
        connect: vi.fn().mockResolvedValue(client),
      });

      await expect(deleteFamilyData(pool, FAMILY_ID)).rejects.toThrow('FK violation');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });

    it('returns zero counts for family with no data', async () => {
      const client = {
        query: vi.fn().mockResolvedValue({ rowCount: 0 }),
        release: vi.fn(),
      };
      const pool = createMockPool({
        connect: vi.fn().mockResolvedValue(client),
      });

      const result = await deleteFamilyData(pool, FAMILY_ID);

      expect(result.counts.messages).toBe(0);
      expect(result.counts.conversations).toBe(0);
      expect(result.counts.posts).toBe(0);
      expect(result.counts.families).toBe(0);
    });

    it('GDPR: deletes audit events along with all other data', async () => {
      const client = {
        query: vi.fn().mockResolvedValue({ rowCount: 0 }),
        release: vi.fn(),
      };
      const pool = createMockPool({
        connect: vi.fn().mockResolvedValue(client),
      });

      await deleteFamilyData(pool, FAMILY_ID);

      const deleteCalls = client.query.mock.calls
        .filter((c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('DELETE'))
        .map((c: unknown[]) => c[0] as string);

      // Audit events must be deleted
      expect(deleteCalls.some((s: string) => s.includes('DELETE FROM public.audit_events'))).toBe(true);
      // Family record itself must be deleted
      expect(deleteCalls.some((s: string) => s.includes('DELETE FROM public.families'))).toBe(true);
    });

    it('deletes media variants before media items (FK order)', async () => {
      const client = {
        query: vi.fn().mockResolvedValue({ rowCount: 0 }),
        release: vi.fn(),
      };
      const pool = createMockPool({
        connect: vi.fn().mockResolvedValue(client),
      });

      await deleteFamilyData(pool, FAMILY_ID);

      const deleteCalls = client.query.mock.calls
        .filter((c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('DELETE'))
        .map((c: unknown[]) => c[0] as string);

      const variantsIdx = deleteCalls.findIndex((s: string) => s.includes('DELETE FROM public.media_variants'));
      const mediaIdx = deleteCalls.findIndex((s: string) => s.includes('DELETE FROM public.media_items'));
      expect(variantsIdx).toBeLessThan(mediaIdx);
    });
  });

  // ==============================================================
  // verifyDataIntegrity
  // ==============================================================
  describe('verifyDataIntegrity', () => {
    it('returns valid report when no issues found', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: FAMILY_ID }] })  // family exists
          .mockResolvedValueOnce({ rows: [] })                    // orphaned posts
          .mockResolvedValueOnce({ rows: [] })                    // orphaned media
          .mockResolvedValueOnce({ rows: [] })                    // orphaned variants (first query)
          .mockResolvedValueOnce({ rows: [] })                    // dangling variants (second query)
          .mockResolvedValueOnce({ rows: [] })                    // orphaned messages
          .mockResolvedValueOnce({ rows: [] })                    // orphaned vault items
          .mockResolvedValueOnce({ rows: [] }),                   // orphaned relationships
      });

      const report = await verifyDataIntegrity(pool, FAMILY_ID);

      expect(report.family_id).toBe(FAMILY_ID);
      expect(report.valid).toBe(true);
      expect(report.issues).toHaveLength(0);
      expect(report.checked_at).toBeDefined();
    });

    it('returns invalid when family does not exist', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [] }),
      });

      const report = await verifyDataIntegrity(pool, 'nonexistent');

      expect(report.valid).toBe(false);
      expect(report.issues).toContain('Family record not found');
    });

    it('detects orphaned posts with missing authors', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: FAMILY_ID }] })                // family exists
          .mockResolvedValueOnce({ rows: [{ id: 'post-1' }, { id: 'post-2' }] }) // 2 orphaned posts
          .mockResolvedValueOnce({ rows: [] })                                   // no orphaned media
          .mockResolvedValueOnce({ rows: [] })                                   // variants check 1
          .mockResolvedValueOnce({ rows: [] })                                   // variants check 2
          .mockResolvedValueOnce({ rows: [] })                                   // no orphaned messages
          .mockResolvedValueOnce({ rows: [] })                                   // no orphaned vault items
          .mockResolvedValueOnce({ rows: [] }),                                  // no orphaned rels
      });

      const report = await verifyDataIntegrity(pool, FAMILY_ID);

      expect(report.valid).toBe(false);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0]).toContain('2 post(s) with authors not in family members');
    });

    it('detects orphaned messages from non-member senders', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: FAMILY_ID }] })  // family exists
          .mockResolvedValueOnce({ rows: [] })                    // posts ok
          .mockResolvedValueOnce({ rows: [] })                    // media ok
          .mockResolvedValueOnce({ rows: [] })                    // variants check 1
          .mockResolvedValueOnce({ rows: [] })                    // variants check 2
          .mockResolvedValueOnce({ rows: [{ id: 'msg-1' }] })    // 1 orphaned message
          .mockResolvedValueOnce({ rows: [] })                    // vault items ok
          .mockResolvedValueOnce({ rows: [] }),                   // rels ok
      });

      const report = await verifyDataIntegrity(pool, FAMILY_ID);

      expect(report.valid).toBe(false);
      expect(report.issues.some(i => i.includes('message(s) from senders not in family members'))).toBe(true);
    });

    it('detects orphaned relationships with missing users', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: FAMILY_ID }] })   // family exists
          .mockResolvedValueOnce({ rows: [] })                     // posts ok
          .mockResolvedValueOnce({ rows: [] })                     // media ok
          .mockResolvedValueOnce({ rows: [] })                     // variants check 1
          .mockResolvedValueOnce({ rows: [] })                     // variants check 2
          .mockResolvedValueOnce({ rows: [] })                     // messages ok
          .mockResolvedValueOnce({ rows: [] })                     // vault items ok
          .mockResolvedValueOnce({ rows: [{ id: 'rel-1' }, { id: 'rel-2' }, { id: 'rel-3' }] }), // 3 orphaned
      });

      const report = await verifyDataIntegrity(pool, FAMILY_ID);

      expect(report.valid).toBe(false);
      expect(report.issues.some(i => i.includes('3 relationship(s) referencing users not in family members'))).toBe(true);
    });

    it('reports multiple issues at once', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: FAMILY_ID }] })                // family exists
          .mockResolvedValueOnce({ rows: [{ id: 'post-1' }] })                 // 1 orphaned post
          .mockResolvedValueOnce({ rows: [{ id: 'media-1' }] })                // 1 orphaned media
          .mockResolvedValueOnce({ rows: [] })                                  // variants check 1
          .mockResolvedValueOnce({ rows: [] })                                  // variants check 2
          .mockResolvedValueOnce({ rows: [{ id: 'msg-1' }, { id: 'msg-2' }] }) // 2 orphaned messages
          .mockResolvedValueOnce({ rows: [] })                                  // vault items ok
          .mockResolvedValueOnce({ rows: [{ id: 'rel-1' }] }),                 // 1 orphaned rel
      });

      const report = await verifyDataIntegrity(pool, FAMILY_ID);

      expect(report.valid).toBe(false);
      expect(report.issues).toHaveLength(4);
    });
  });

  // ==============================================================
  // getDataSummary
  // ==============================================================
  describe('getDataSummary', () => {
    it('returns counts for all entity types', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ count: 5 }] })   // members
          .mockResolvedValueOnce({ rows: [{ count: 12 }] })  // posts
          .mockResolvedValueOnce({ rows: [{ count: 30 }] })  // media
          .mockResolvedValueOnce({ rows: [{ count: 8 }] })   // events
          .mockResolvedValueOnce({ rows: [{ count: 15 }] })  // recipes
          .mockResolvedValueOnce({ rows: [{ count: 3 }] })   // conversations
          .mockResolvedValueOnce({ rows: [{ count: 200 }] }) // messages
          .mockResolvedValueOnce({ rows: [{ count: 2 }] }),  // vaults
      });

      const summary = await getDataSummary(pool, FAMILY_ID);

      expect(summary.members).toBe(5);
      expect(summary.posts).toBe(12);
      expect(summary.media).toBe(30);
      expect(summary.events).toBe(8);
      expect(summary.recipes).toBe(15);
      expect(summary.conversations).toBe(3);
      expect(summary.messages).toBe(200);
      expect(summary.vaults).toBe(2);
    });

    it('returns zeros for empty family', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [{ count: 0 }] }),
      });

      const summary = await getDataSummary(pool, FAMILY_ID);

      expect(summary.members).toBe(0);
      expect(summary.posts).toBe(0);
      expect(summary.media).toBe(0);
      expect(summary.events).toBe(0);
      expect(summary.recipes).toBe(0);
      expect(summary.conversations).toBe(0);
      expect(summary.messages).toBe(0);
      expect(summary.vaults).toBe(0);
    });

    it('handles null count rows gracefully', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [undefined] }),
      });

      const summary = await getDataSummary(pool, FAMILY_ID);

      expect(summary.members).toBe(0);
      expect(summary.posts).toBe(0);
    });

    it('queries each table with the correct family_id', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [{ count: 0 }] }),
      });

      await getDataSummary(pool, FAMILY_ID);

      // All 8 queries should include the family ID parameter
      expect(pool.query).toHaveBeenCalledTimes(8);
      for (let i = 0; i < 8; i++) {
        const params = pool.query.mock.calls[i][1];
        expect(params).toContain(FAMILY_ID);
      }
    });
  });
});
