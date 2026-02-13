import { describe, it, expect, vi } from 'vitest';
import { admitStream, heartbeat, endSession, evictTimedOut, getActiveSessions } from './stream-gateway';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = '550e8400-e29b-41d4-a716-446655440001';

function createMockPool(overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows: [{ id: UUID, count: 0 }], rowCount: 1 }),
    ...overrides,
  } as never;
}

describe('stream gateway', () => {
  describe('admitStream', () => {
    it('admits when under concurrency limits', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // user count
          .mockResolvedValueOnce({ rows: [{ count: 2 }] }) // family count
          .mockResolvedValueOnce({ rows: [{ id: UUID }] }), // insert
      });
      const result = await admitStream(pool, {
        user_id: UUID, family_id: UUID2, content_id: 'video-1',
      });
      expect(result.admitted).toBe(true);
      expect(result.session_token).toBeTruthy();
      expect(result.playback_url).toContain('/stream/');
    });

    it('denies when user concurrency exceeded', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ count: 3 }] }), // user count = max
      });
      const result = await admitStream(pool, {
        user_id: UUID, family_id: UUID2, content_id: 'video-1',
      });
      expect(result.admitted).toBe(false);
      expect(result.denial_reason).toContain('per user');
    });

    it('denies when family concurrency exceeded', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ count: 1 }] }) // user ok
          .mockResolvedValueOnce({ rows: [{ count: 10 }] }), // family = max
      });
      const result = await admitStream(pool, {
        user_id: UUID, family_id: UUID2, content_id: 'video-1',
      });
      expect(result.admitted).toBe(false);
      expect(result.denial_reason).toContain('per family');
    });

    it('respects custom concurrency limits', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ count: 1 }] }), // user count = custom max
      });
      const result = await admitStream(pool, {
        user_id: UUID, family_id: UUID2, content_id: 'video-1',
        max_concurrent_per_user: 1,
      });
      expect(result.admitted).toBe(false);
    });
  });

  describe('heartbeat', () => {
    it('updates heartbeat for active session', async () => {
      const pool = createMockPool();
      const result = await heartbeat(pool, 'session-token-123');
      expect(result).toBe(true);
    });

    it('returns false for non-existent session', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rowCount: 0 }),
      });
      const result = await heartbeat(pool, 'invalid');
      expect(result).toBe(false);
    });
  });

  describe('endSession', () => {
    it('ends an active session', async () => {
      const pool = createMockPool();
      const result = await endSession(pool, 'session-token-123');
      expect(result).toBe(true);
    });
  });

  describe('evictTimedOut', () => {
    it('evicts timed-out sessions', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rowCount: 3 }),
      });
      const count = await evictTimedOut(pool);
      expect(count).toBe(3);
    });

    it('returns 0 when no sessions to evict', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rowCount: 0 }),
      });
      const count = await evictTimedOut(pool);
      expect(count).toBe(0);
    });
  });

  describe('getActiveSessions', () => {
    it('returns active sessions for user', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({
          rows: [{ id: '1', content_id: 'v1' }, { id: '2', content_id: 'v2' }],
        }),
      });
      const sessions = await getActiveSessions(pool, UUID);
      expect(sessions).toHaveLength(2);
    });
  });
});
