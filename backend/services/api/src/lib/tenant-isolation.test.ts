import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Module imports ---
import { writeAuditEvent, queryAuditEvents } from './audit';
import {
  buildStoragePath,
  createMediaItem,
  findByChecksum,
} from './media';
import {
  evaluatePostVisibility,
  getFamilySettings,
  updateFamilySettings,
} from './visibility';
import {
  createGenealogyProfile,
  getGenealogyProfiles,
  validateRelationshipGraph,
  detectDuplicates,
} from './genealogy';
import {
  createEvent,
  generateICalFeed,
} from './calendar';
import {
  updateLocation,
  getActiveLocations,
} from './location';
import {
  createRecipe,
  generateShoppingList,
} from './recipes';
import {
  createConversation,
  sendMessage,
  searchMessages,
} from './chat';
import {
  createNotification,
  getNotifications,
  markNotificationsRead,
  getUnreadNotificationCount,
} from './notifications';
import {
  createVault,
  getInheritanceScenarios,
  setDigitalSuccessor,
  getDigitalSuccessor,
  confirmSuccessor,
  requestMemorial,
} from './vault';
import {
  indexContent,
  search,
  searchCount,
  getSearchFacets,
  logActivity,
  getActivityFeed,
} from './search';
import {
  registerDevice,
  getFamilyDevices,
  getDeviceCount,
} from './devices';
import {
  admitStream,
} from './stream-gateway';
import {
  trackUsage,
  getUsageMetrics,
  checkQuota,
  setEntitlement,
  getEntitlements,
} from './analytics';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a mock PG pool that returns configurable rows and rowCount.
 */
function createMockPool(rows: unknown[] = [{ id: 'test-id' }], overrides: Record<string, unknown> = {}) {
  const clientQuery = vi.fn().mockResolvedValue({ rows, rowCount: rows.length, ...overrides });
  const client = {
    query: clientQuery,
    release: vi.fn(),
  };
  return {
    pool: {
      query: vi.fn().mockResolvedValue({ rows, rowCount: rows.length, ...overrides }),
      connect: vi.fn().mockResolvedValue(client),
    } as any,
    client,
  };
}

// Two distinct family IDs used throughout the tests
const FAMILY_A = '11111111-1111-1111-1111-111111111111';
const FAMILY_B = '22222222-2222-2222-2222-222222222222';
const USER_A = 'aaaa-aaaa-aaaa-aaaa';
const USER_B = 'bbbb-bbbb-bbbb-bbbb';

// ---------------------------------------------------------------------------
// 1. Audit isolation
// ---------------------------------------------------------------------------
describe('Tenant isolation — Audit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writeAuditEvent passes family_id as a parameterized value', async () => {
    const { pool } = createMockPool([{ id: 'audit-1' }]);
    await writeAuditEvent(pool, {
      family_id: FAMILY_A,
      event_type: 'login',
      actor_id: USER_A,
    });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('$1');
    expect(params[0]).toBe(FAMILY_A);
    // Ensure family_id is NEVER interpolated into the SQL string
    expect(sql).not.toContain(FAMILY_A);
  });

  it('queryAuditEvents scopes results by family_id when provided', async () => {
    const { pool } = createMockPool([]);
    await queryAuditEvents(pool, { family_id: FAMILY_A });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('family_id = $1');
    expect(params[0]).toBe(FAMILY_A);
  });

  it('queryAuditEvents without family_id does NOT add family_id filter', async () => {
    const { pool } = createMockPool([]);
    await queryAuditEvents(pool, { event_type: 'login' });
    const [sql, params] = pool.query.mock.calls[0];
    // The first parameter should be 'login', not a family_id
    expect(params[0]).toBe('login');
    // Still uses parameterized values
    expect(sql).not.toContain('login');
  });
});

// ---------------------------------------------------------------------------
// 2. Media / storage path isolation
// ---------------------------------------------------------------------------
describe('Tenant isolation — Media', () => {
  beforeEach(() => vi.clearAllMocks());

  it('buildStoragePath includes family_id in the path', () => {
    const pathA = buildStoragePath('dev', FAMILY_A, 'media-1', 'photo.jpg');
    const pathB = buildStoragePath('dev', FAMILY_B, 'media-1', 'photo.jpg');
    expect(pathA).toContain(FAMILY_A);
    expect(pathB).toContain(FAMILY_B);
    expect(pathA).not.toEqual(pathB);
  });

  it('buildStoragePath for family A never contains family B id', () => {
    const path = buildStoragePath('prod', FAMILY_A, 'media-99', 'img.png');
    expect(path).toContain(FAMILY_A);
    expect(path).not.toContain(FAMILY_B);
  });

  it('createMediaItem passes family_id as parameterized $1', async () => {
    const { pool } = createMockPool([{ id: 'media-1' }]);
    await createMediaItem(pool, {
      family_id: FAMILY_A,
      uploaded_by: USER_A,
      file_name: 'photo.jpg',
      mime_type: 'image/jpeg',
      file_size: 1024,
      storage_path: `dev/${FAMILY_A}/family/media/m1/photo.jpg`,
      checksum_sha256: 'abc',
    });
    const params = pool.query.mock.calls[0][1];
    expect(params[0]).toBe(FAMILY_A);
  });

  it('findByChecksum scopes lookup to family_id', async () => {
    const { pool } = createMockPool([]);
    await findByChecksum(pool, FAMILY_A, 'checksum-value');
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('family_id = $1');
    expect(params[0]).toBe(FAMILY_A);
    expect(sql).not.toContain(FAMILY_A);
  });
});

// ---------------------------------------------------------------------------
// 3. Visibility / family settings isolation
// ---------------------------------------------------------------------------
describe('Tenant isolation — Visibility & Family Settings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('evaluatePostVisibility queries with family_id join', async () => {
    const { pool } = createMockPool([{
      visibility: 'family',
      author_id: USER_A,
      family_id: FAMILY_A,
      islamic_mode_enabled: false,
      viewer_role: 'ADULT_MEMBER',
      viewer_state: 'active',
    }]);
    const result = await evaluatePostVisibility(pool, 'post-1', {
      viewerId: USER_A,
      viewerRole: 'ADULT_MEMBER',
      familyId: FAMILY_A,
    });
    expect(result.allowed).toBe(true);
    const sql = pool.query.mock.calls[0][0];
    // The query joins on family_id ensuring tenant scoping
    expect(sql).toContain('p.family_id');
    expect(sql).toContain('fm.family_id');
  });

  it('getFamilySettings scopes to family_id', async () => {
    const { pool } = createMockPool([{ family_id: FAMILY_A, islamic_mode_enabled: false }]);
    await getFamilySettings(pool, FAMILY_A);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('family_id = $1');
    expect(params[0]).toBe(FAMILY_A);
  });

  it('updateFamilySettings scopes to family_id when updating', async () => {
    // First call: getFamilySettings returns existing
    const { pool } = createMockPool([{ family_id: FAMILY_A, islamic_mode_enabled: false }]);
    await updateFamilySettings(pool, FAMILY_A, { islamic_mode_enabled: true }, USER_A);
    // The second query (UPDATE) should include family_id in WHERE clause
    const updateCall = pool.query.mock.calls[1];
    expect(updateCall[0]).toContain('WHERE family_id');
    expect(updateCall[1]).toContain(FAMILY_A);
  });
});

// ---------------------------------------------------------------------------
// 4. Genealogy isolation
// ---------------------------------------------------------------------------
describe('Tenant isolation — Genealogy', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createGenealogyProfile inserts with family_id as $1', async () => {
    const { pool } = createMockPool([{ id: 'profile-1' }]);
    await createGenealogyProfile(pool, { family_id: FAMILY_A, full_name: 'Test User' });
    const params = pool.query.mock.calls[0][1];
    expect(params[0]).toBe(FAMILY_A);
  });

  it('getGenealogyProfiles scopes query to family_id', async () => {
    const { pool } = createMockPool([]);
    await getGenealogyProfiles(pool, FAMILY_A);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('family_id = $1');
    expect(params[0]).toBe(FAMILY_A);
  });

  it('validateRelationshipGraph scopes all checks to family_id', async () => {
    const { pool } = createMockPool([]);
    await validateRelationshipGraph(pool, FAMILY_A);
    // Both queries (contradictions and self-relationships) should scope by family_id
    for (const call of pool.query.mock.calls) {
      const [sql, params] = call;
      expect(sql).toContain('family_id = $1');
      expect(params[0]).toBe(FAMILY_A);
    }
  });

  it('detectDuplicates scopes to family_id', async () => {
    const { pool } = createMockPool([]);
    await detectDuplicates(pool, FAMILY_A, 'John Doe');
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('family_id = $1');
    expect(params[0]).toBe(FAMILY_A);
    expect(sql).not.toContain(FAMILY_A);
  });
});

// ---------------------------------------------------------------------------
// 5. Calendar isolation
// ---------------------------------------------------------------------------
describe('Tenant isolation — Calendar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createEvent inserts with family_id as $1', async () => {
    const { pool } = createMockPool([{ id: 'event-1' }]);
    await createEvent(pool, {
      family_id: FAMILY_A,
      title: 'Birthday',
      start_at: '2025-06-15T10:00:00Z',
      created_by: USER_A,
    });
    const params = pool.query.mock.calls[0][1];
    expect(params[0]).toBe(FAMILY_A);
  });

  it('generateICalFeed scopes events to family_id', async () => {
    const { pool } = createMockPool([]);
    await generateICalFeed(pool, FAMILY_A);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('family_id = $1');
    expect(params[0]).toBe(FAMILY_A);
  });
});

// ---------------------------------------------------------------------------
// 6. Location isolation
// ---------------------------------------------------------------------------
describe('Tenant isolation — Location', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updateLocation stores location with family_id', async () => {
    const { pool } = createMockPool([{ id: 'loc-1' }]);
    await updateLocation(pool, {
      user_id: USER_A,
      family_id: FAMILY_A,
      latitude: 41.0,
      longitude: -80.5,
    });
    const params = pool.query.mock.calls[0][1];
    expect(params[1]).toBe(FAMILY_A);
  });

  it('getActiveLocations scopes to family_id', async () => {
    const { pool } = createMockPool([]);
    await getActiveLocations(pool, FAMILY_A);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('ls.family_id = $1');
    expect(params[0]).toBe(FAMILY_A);
  });
});

// ---------------------------------------------------------------------------
// 7. Recipe isolation
// ---------------------------------------------------------------------------
describe('Tenant isolation — Recipes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createRecipe inserts with family_id as $1', async () => {
    const { pool } = createMockPool([{ id: 'recipe-1' }]);
    await createRecipe(pool, {
      family_id: FAMILY_A,
      title: 'Pasta',
      created_by: USER_A,
    });
    const params = pool.query.mock.calls[0][1];
    expect(params[0]).toBe(FAMILY_A);
  });

  it('generateShoppingList scopes to family_id', async () => {
    const { pool } = createMockPool([]);
    await generateShoppingList(pool, FAMILY_A, '2025-06-01', '2025-06-07');
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('mp.family_id = $1');
    expect(params[0]).toBe(FAMILY_A);
  });
});

// ---------------------------------------------------------------------------
// 8. Chat isolation
// ---------------------------------------------------------------------------
describe('Tenant isolation — Chat', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createConversation scopes to family_id', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [{ id: 'conv-1' }] }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn().mockResolvedValue(client) } as any;

    await createConversation(pool, {
      family_id: FAMILY_A,
      type: 'group',
      title: 'Family Chat',
      created_by: USER_A,
      member_ids: [USER_A, USER_B],
    });

    // The INSERT conversation query is the second call (after BEGIN)
    const insertCall = client.query.mock.calls[1];
    const params = insertCall[1];
    expect(params[0]).toBe(FAMILY_A);
    // family_id is never in the SQL literal
    expect(insertCall[0]).not.toContain(FAMILY_A);
  });

  it('searchMessages scopes to conversations the user is a member of', async () => {
    const { pool } = createMockPool([]);
    await searchMessages(pool, USER_A, 'hello');
    const [sql, params] = pool.query.mock.calls[0];
    // Membership join ensures tenant scoping
    expect(sql).toContain('conversation_members');
    expect(sql).toContain('cm.user_id = $1');
    expect(params[0]).toBe(USER_A);
  });
});

// ---------------------------------------------------------------------------
// 9. Notification isolation (scoped to user, not family)
// ---------------------------------------------------------------------------
describe('Tenant isolation — Notifications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createNotification passes family_id and user_id as parameters', async () => {
    const { pool } = createMockPool([{ id: 'notif-1' }]);
    await createNotification(pool, {
      family_id: FAMILY_A,
      user_id: USER_A,
      type: 'message',
      title: 'New message',
    });
    // The INSERT query (first or second call depending on dedup path)
    const lastCall = pool.query.mock.calls[pool.query.mock.calls.length - 1];
    expect(lastCall[1][0]).toBe(FAMILY_A); // family_id is $1
    expect(lastCall[1][1]).toBe(USER_A);   // user_id is $2
  });

  it('getNotifications scopes to user_id', async () => {
    const { pool } = createMockPool([]);
    await getNotifications(pool, USER_A);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('user_id = $1');
    expect(params[0]).toBe(USER_A);
  });

  it('markNotificationsRead scopes to user_id', async () => {
    const { pool } = createMockPool([], { rowCount: 2 });
    await markNotificationsRead(pool, USER_A, ['n1', 'n2']);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('user_id = $1');
    expect(params[0]).toBe(USER_A);
  });

  it('getUnreadNotificationCount scopes to user_id', async () => {
    const { pool } = createMockPool([{ count: '5' }]);
    await getUnreadNotificationCount(pool, USER_A);
    const params = pool.query.mock.calls[0][1];
    expect(params[0]).toBe(USER_A);
  });
});

// ---------------------------------------------------------------------------
// 10. Vault isolation
// ---------------------------------------------------------------------------
describe('Tenant isolation — Vault', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createVault inserts with family_id as $1', async () => {
    const { pool } = createMockPool([{ id: 'vault-1' }]);
    await createVault(pool, {
      family_id: FAMILY_A,
      owner_id: USER_A,
      title: 'My Legacy',
    });
    const params = pool.query.mock.calls[0][1];
    expect(params[0]).toBe(FAMILY_A);
  });

  it('getInheritanceScenarios scopes to family_id AND owner_id', async () => {
    const { pool } = createMockPool([]);
    await getInheritanceScenarios(pool, FAMILY_A, USER_A);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('family_id = $1');
    expect(sql).toContain('owner_id = $2');
    expect(params[0]).toBe(FAMILY_A);
    expect(params[1]).toBe(USER_A);
  });

  it('setDigitalSuccessor scopes to family_id', async () => {
    const { pool } = createMockPool([{ id: 'succ-1' }]);
    await setDigitalSuccessor(pool, {
      family_id: FAMILY_A,
      owner_id: USER_A,
      successor_id: USER_B,
    });
    const params = pool.query.mock.calls[0][1];
    expect(params[0]).toBe(FAMILY_A);
  });

  it('getDigitalSuccessor scopes to family_id', async () => {
    const { pool } = createMockPool([]);
    await getDigitalSuccessor(pool, FAMILY_A, USER_A);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('ds.family_id = $1');
    expect(params[0]).toBe(FAMILY_A);
  });

  it('confirmSuccessor scopes to family_id, owner_id, and successor_id', async () => {
    const { pool } = createMockPool([], { rowCount: 1 });
    await confirmSuccessor(pool, FAMILY_A, USER_A, USER_B);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('family_id = $1');
    expect(params[0]).toBe(FAMILY_A);
    expect(params[1]).toBe(USER_A);
    expect(params[2]).toBe(USER_B);
  });

  it('requestMemorial scopes to family_id', async () => {
    const { pool } = createMockPool([{ id: 'memorial-1' }]);
    await requestMemorial(pool, {
      user_id: USER_A,
      family_id: FAMILY_A,
      requested_by: USER_B,
    });
    const params = pool.query.mock.calls[0][1];
    expect(params[1]).toBe(FAMILY_A); // family_id is $2 in this function
  });
});

// ---------------------------------------------------------------------------
// 11. Search isolation
// ---------------------------------------------------------------------------
describe('Tenant isolation — Search', () => {
  beforeEach(() => vi.clearAllMocks());

  it('indexContent stores family_id as $1', async () => {
    const { pool } = createMockPool([{ id: 'idx-1' }]);
    await indexContent(pool, {
      family_id: FAMILY_A,
      content_type: 'post',
      content_id: 'post-1',
      title: 'Test',
      body: 'Body text',
    });
    const params = pool.query.mock.calls[0][1];
    expect(params[0]).toBe(FAMILY_A);
  });

  it('search scopes query to family_id', async () => {
    const { pool } = createMockPool([]);
    await search(pool, { family_id: FAMILY_A, query: 'hello' });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('si.family_id = $1');
    expect(params[0]).toBe(FAMILY_A);
  });

  it('searchCount scopes to family_id', async () => {
    const { pool } = createMockPool([{ count: 0 }]);
    await searchCount(pool, FAMILY_A, 'hello');
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('family_id = $1');
    expect(params[0]).toBe(FAMILY_A);
  });

  it('getSearchFacets scopes to family_id', async () => {
    const { pool } = createMockPool([]);
    await getSearchFacets(pool, FAMILY_A, 'test');
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('family_id = $1');
    expect(params[0]).toBe(FAMILY_A);
  });

  it('logActivity stores family_id', async () => {
    const { pool } = createMockPool([{ id: 'act-1' }]);
    await logActivity(pool, {
      family_id: FAMILY_A,
      actor_id: USER_A,
      action: 'create',
      target_type: 'post',
      target_id: 'post-1',
    });
    const params = pool.query.mock.calls[0][1];
    expect(params[0]).toBe(FAMILY_A);
  });

  it('getActivityFeed scopes to family_id', async () => {
    const { pool } = createMockPool([]);
    await getActivityFeed(pool, FAMILY_A);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('al.family_id = $1');
    expect(params[0]).toBe(FAMILY_A);
  });
});

// ---------------------------------------------------------------------------
// 12. Device isolation
// ---------------------------------------------------------------------------
describe('Tenant isolation — Devices', () => {
  beforeEach(() => vi.clearAllMocks());

  it('registerDevice inserts with family_id as $1', async () => {
    const { pool } = createMockPool([{ id: 'dev-1' }]);
    await registerDevice(pool, {
      family_id: FAMILY_A,
      user_id: USER_A,
      device_name: 'TV',
      device_type: 'tv',
    });
    const params = pool.query.mock.calls[0][1];
    expect(params[0]).toBe(FAMILY_A);
  });

  it('getFamilyDevices scopes to family_id', async () => {
    const { pool } = createMockPool([]);
    await getFamilyDevices(pool, FAMILY_A);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('family_id = $1');
    expect(params[0]).toBe(FAMILY_A);
  });

  it('getDeviceCount scopes to family_id', async () => {
    const { pool } = createMockPool([{ total: 3, active: 2 }]);
    await getDeviceCount(pool, FAMILY_A);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('family_id = $1');
    expect(params[0]).toBe(FAMILY_A);
  });
});

// ---------------------------------------------------------------------------
// 13. Stream gateway isolation
// ---------------------------------------------------------------------------
describe('Tenant isolation — Stream Gateway', () => {
  beforeEach(() => vi.clearAllMocks());

  it('admitStream scopes family concurrency check to family_id', async () => {
    const { pool } = createMockPool([{ count: 0 }]);
    // Mock returns for: user count, family count, session insert
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })  // user session count
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })  // family session count
      .mockResolvedValueOnce({ rows: [{ id: 'session-1' }] }); // insert

    await admitStream(pool, {
      user_id: USER_A,
      family_id: FAMILY_A,
      content_id: 'content-1',
    });

    // The second query (family concurrency) must scope by family_id
    const [familySql, familyParams] = pool.query.mock.calls[1];
    expect(familySql).toContain('family_id = $1');
    expect(familyParams[0]).toBe(FAMILY_A);

    // The insert must include family_id
    const insertParams = pool.query.mock.calls[2][1];
    expect(insertParams[1]).toBe(FAMILY_A);
  });
});

// ---------------------------------------------------------------------------
// 14. Analytics isolation
// ---------------------------------------------------------------------------
describe('Tenant isolation — Analytics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('trackUsage passes family_id as $1', async () => {
    const { pool } = createMockPool([{ id: 'usage-1' }]);
    await trackUsage(pool, {
      family_id: FAMILY_A,
      metric_type: 'storage_bytes',
      value: 1024,
      period_start: '2025-06-01',
      period_end: '2025-06-30',
    });
    const params = pool.query.mock.calls[0][1];
    expect(params[0]).toBe(FAMILY_A);
  });

  it('getUsageMetrics scopes to family_id', async () => {
    const { pool } = createMockPool([]);
    await getUsageMetrics(pool, FAMILY_A);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('family_id = $1');
    expect(params[0]).toBe(FAMILY_A);
  });

  it('checkQuota scopes usage and limits to family_id', async () => {
    const { pool } = createMockPool([{ current_value: 0 }]);
    pool.query
      .mockResolvedValueOnce({ rows: [{ current_value: 100 }] })   // usage
      .mockResolvedValueOnce({ rows: [{ soft_limit: 500, hard_limit: 1000, alert_threshold_pct: 80 }] }); // limits

    await checkQuota(pool, FAMILY_A, 'storage_bytes');

    // Usage query must scope by family_id
    const [usageSql, usageParams] = pool.query.mock.calls[0];
    expect(usageSql).toContain('family_id = $1');
    expect(usageParams[0]).toBe(FAMILY_A);

    // Limits query must scope by family_id
    const [limitSql, limitParams] = pool.query.mock.calls[1];
    expect(limitParams).toContain(FAMILY_A);
  });

  it('setEntitlement scopes to family_id and user_id', async () => {
    const { pool } = createMockPool([{ id: 'ent-1' }]);
    await setEntitlement(pool, {
      family_id: FAMILY_A,
      user_id: USER_A,
      claim_type: 'can_watch',
      claim_value: 'true',
    });
    const params = pool.query.mock.calls[0][1];
    expect(params[0]).toBe(FAMILY_A);
    expect(params[1]).toBe(USER_A);
  });

  it('getEntitlements scopes to family_id and user_id', async () => {
    const { pool } = createMockPool([]);
    await getEntitlements(pool, FAMILY_A, USER_A);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('family_id = $1');
    expect(sql).toContain('user_id = $2');
    expect(params[0]).toBe(FAMILY_A);
    expect(params[1]).toBe(USER_A);
  });
});

// ---------------------------------------------------------------------------
// 15. Adversarial — SQL injection in family_id
// ---------------------------------------------------------------------------
describe('Adversarial — SQL injection via family_id', () => {
  beforeEach(() => vi.clearAllMocks());

  const MALICIOUS_ID = "'; DROP TABLE users; --";

  it('createMediaItem: malicious family_id is only in params, never in SQL', async () => {
    const { pool } = createMockPool([{ id: 'media-1' }]);
    await createMediaItem(pool, {
      family_id: MALICIOUS_ID,
      uploaded_by: USER_A,
      file_name: 'photo.jpg',
      mime_type: 'image/jpeg',
      file_size: 1024,
      storage_path: 'path',
      checksum_sha256: 'abc',
    });
    const [sql, params] = pool.query.mock.calls[0];
    // The SQL template must use placeholders, never the raw value
    expect(sql).not.toContain(MALICIOUS_ID);
    expect(params[0]).toBe(MALICIOUS_ID);
  });

  it('search: malicious family_id is parameterized', async () => {
    const { pool } = createMockPool([]);
    await search(pool, { family_id: MALICIOUS_ID, query: 'test' });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toContain(MALICIOUS_ID);
    expect(params[0]).toBe(MALICIOUS_ID);
  });

  it('createEvent: malicious family_id is parameterized', async () => {
    const { pool } = createMockPool([{ id: 'event-1' }]);
    await createEvent(pool, {
      family_id: MALICIOUS_ID,
      title: 'Birthday',
      start_at: '2025-06-15T10:00:00Z',
      created_by: USER_A,
    });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toContain(MALICIOUS_ID);
    expect(params[0]).toBe(MALICIOUS_ID);
  });

  it('createVault: malicious family_id is parameterized', async () => {
    const { pool } = createMockPool([{ id: 'vault-1' }]);
    await createVault(pool, {
      family_id: MALICIOUS_ID,
      owner_id: USER_A,
      title: 'Test Vault',
    });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toContain(MALICIOUS_ID);
    expect(params[0]).toBe(MALICIOUS_ID);
  });

  it('registerDevice: malicious family_id is parameterized', async () => {
    const { pool } = createMockPool([{ id: 'dev-1' }]);
    await registerDevice(pool, {
      family_id: MALICIOUS_ID,
      user_id: USER_A,
      device_name: 'TV',
      device_type: 'tv',
    });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toContain(MALICIOUS_ID);
    expect(params[0]).toBe(MALICIOUS_ID);
  });

  it('indexContent: malicious family_id is parameterized', async () => {
    const { pool } = createMockPool([{ id: 'idx-1' }]);
    await indexContent(pool, {
      family_id: MALICIOUS_ID,
      content_type: 'post',
      content_id: 'post-1',
    });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toContain(MALICIOUS_ID);
    expect(params[0]).toBe(MALICIOUS_ID);
  });
});

// ---------------------------------------------------------------------------
// 16. Adversarial — Privilege escalation
// ---------------------------------------------------------------------------
describe('Adversarial — Privilege escalation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('evaluatePostVisibility denies access to non-family members', async () => {
    const { pool } = createMockPool([{
      visibility: 'family',
      author_id: USER_A,
      family_id: FAMILY_A,
      islamic_mode_enabled: false,
      viewer_role: null,       // not a member
      viewer_state: null,
    }]);
    const result = await evaluatePostVisibility(pool, 'post-1', {
      viewerId: USER_B,
      viewerRole: 'ADULT_MEMBER',
      familyId: FAMILY_A,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('not_family_member');
  });

  it('evaluatePostVisibility denies adults_only content to youth members', async () => {
    const { pool } = createMockPool([{
      visibility: 'adults_only',
      author_id: USER_A,
      family_id: FAMILY_A,
      islamic_mode_enabled: false,
      viewer_role: 'YOUTH_MEMBER',
      viewer_state: 'active',
    }]);
    const result = await evaluatePostVisibility(pool, 'post-1', {
      viewerId: USER_B,
      viewerRole: 'YOUTH_MEMBER',
      familyId: FAMILY_A,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('adults_only_content');
  });

  it('evaluatePostVisibility denies private post to non-audience member', async () => {
    const { pool } = createMockPool();
    // First query: post data
    pool.query.mockResolvedValueOnce({
      rows: [{
        visibility: 'private',
        author_id: USER_A,
        family_id: FAMILY_A,
        islamic_mode_enabled: false,
        viewer_role: 'ADULT_MEMBER',
        viewer_state: 'active',
      }],
    });
    // Second query: audience check - empty means not in audience
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await evaluatePostVisibility(pool, 'post-1', {
      viewerId: USER_B,
      viewerRole: 'ADULT_MEMBER',
      familyId: FAMILY_A,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('not_in_audience');
  });
});

// ---------------------------------------------------------------------------
// 17. Cross-tenant search — search never leaks across families
// ---------------------------------------------------------------------------
describe('Adversarial — Cross-tenant search', () => {
  beforeEach(() => vi.clearAllMocks());

  it('search for FAMILY_A never receives FAMILY_B data', async () => {
    const { pool } = createMockPool([
      { id: 'r1', family_id: FAMILY_A, content_type: 'post', content_id: 'p1', title: 'Result', body: null, author_id: USER_A, visibility: 'family', metadata: {}, rank: 1.0, headline: '<mark>Result</mark>', created_at: '2025-01-01' },
    ]);
    const results = await search(pool, { family_id: FAMILY_A, query: 'Result' });
    // Verify query scoped to FAMILY_A
    const [sql, params] = pool.query.mock.calls[0];
    expect(params[0]).toBe(FAMILY_A);
    expect(params[0]).not.toBe(FAMILY_B);
    // All results must belong to FAMILY_A
    for (const r of results) {
      expect(r.family_id).toBe(FAMILY_A);
    }
  });

  it('getSearchFacets for FAMILY_A does not leak FAMILY_B facets', async () => {
    const { pool } = createMockPool([{ content_type: 'post', count: 5 }]);
    await getSearchFacets(pool, FAMILY_A, 'test');
    const params = pool.query.mock.calls[0][1];
    expect(params[0]).toBe(FAMILY_A);
    expect(params[0]).not.toBe(FAMILY_B);
  });
});

// ---------------------------------------------------------------------------
// 18. Cross-tenant notification — notifications scoped to user
// ---------------------------------------------------------------------------
describe('Adversarial — Cross-tenant notification', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getNotifications for USER_A never uses USER_B', async () => {
    const { pool } = createMockPool([
      { id: 'n1', type: 'message', title: 'Test', body: null, data: {}, status: 'pending', created_at: '2025-01-01' },
    ]);
    await getNotifications(pool, USER_A);
    const params = pool.query.mock.calls[0][1];
    expect(params[0]).toBe(USER_A);
    expect(params[0]).not.toBe(USER_B);
  });

  it('markNotificationsRead for USER_A cannot mark USER_B notifications', async () => {
    const { pool } = createMockPool([], { rowCount: 0 });
    await markNotificationsRead(pool, USER_A, ['n-belongs-to-b']);
    const [sql, params] = pool.query.mock.calls[0];
    // Must scope by user_id
    expect(sql).toContain('user_id = $1');
    expect(params[0]).toBe(USER_A);
  });
});

// ---------------------------------------------------------------------------
// 19. Session isolation — sessions are scoped to user, not family
// ---------------------------------------------------------------------------
describe('Tenant isolation — Session isolation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('a user belonging to two families gets separate audit trails per family', async () => {
    const { pool } = createMockPool([{ id: 'a1' }]);

    // Write to family A
    await writeAuditEvent(pool, { family_id: FAMILY_A, event_type: 'login', actor_id: USER_A });
    const paramsA = pool.query.mock.calls[0][1];
    expect(paramsA[0]).toBe(FAMILY_A);

    // Write to family B
    await writeAuditEvent(pool, { family_id: FAMILY_B, event_type: 'login', actor_id: USER_A });
    const paramsB = pool.query.mock.calls[1][1];
    expect(paramsB[0]).toBe(FAMILY_B);

    // Same user, different family scoping in each call
    expect(paramsA[0]).not.toBe(paramsB[0]);
  });

  it('notifications are user-scoped, not family-scoped (user can see all their notifications)', async () => {
    const { pool } = createMockPool([]);
    await getNotifications(pool, USER_A);
    const [sql] = pool.query.mock.calls[0];
    // The query uses user_id, not family_id, as the primary scope
    expect(sql).toContain('user_id = $1');
    // The query should NOT require family_id as a filter (notifications are cross-family per user)
    expect(sql).not.toMatch(/WHERE.*family_id\s*=\s*\$/);
  });
});
