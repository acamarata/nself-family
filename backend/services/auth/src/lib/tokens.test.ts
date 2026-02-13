import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashRefreshToken, storeRefreshToken, findRefreshToken, revokeRefreshToken, revokeTokenFamily, revokeAllUserTokens, createSession, deactivateSession, deactivateAllSessions } from './tokens.js';

// Mock pool
const mockPool = {
  query: vi.fn().mockResolvedValue({ rows: [{ id: 'test-id' }], rowCount: 1 }),
} as any;

describe('tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hashRefreshToken', () => {
    it('produces consistent SHA-256 hash', () => {
      const hash1 = hashRefreshToken('test-token');
      const hash2 = hashRefreshToken('test-token');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('produces different hashes for different inputs', () => {
      const hash1 = hashRefreshToken('token-a');
      const hash2 = hashRefreshToken('token-b');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('storeRefreshToken', () => {
    it('inserts token into database', async () => {
      const id = await storeRefreshToken(mockPool, 'user-1', 'hash', 'session-1', 'family-1', 3600);
      expect(id).toBe('test-id');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO auth.refresh_tokens'),
        ['user-1', 'hash', 'session-1', 'family-1', 3600],
      );
    });
  });

  describe('findRefreshToken', () => {
    it('returns token record when found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 't1', user_id: 'u1', session_id: 's1', family_chain: 'f1' }],
      });
      const result = await findRefreshToken(mockPool, 'hash');
      expect(result).toEqual({ id: 't1', user_id: 'u1', session_id: 's1', family_chain: 'f1' });
    });

    it('returns null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const result = await findRefreshToken(mockPool, 'missing');
      expect(result).toBeNull();
    });
  });

  describe('revokeRefreshToken', () => {
    it('updates revoked_at for the token', async () => {
      await revokeRefreshToken(mockPool, 'token-id');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE auth.refresh_tokens SET revoked_at'),
        ['token-id'],
      );
    });
  });

  describe('revokeTokenFamily', () => {
    it('revokes all tokens in the family', async () => {
      await revokeTokenFamily(mockPool, 'family-chain-id');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE family_chain'),
        ['family-chain-id'],
      );
    });
  });

  describe('revokeAllUserTokens', () => {
    it('revokes all user refresh tokens', async () => {
      await revokeAllUserTokens(mockPool, 'user-id');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id'),
        ['user-id'],
      );
    });
  });

  describe('createSession', () => {
    it('creates a session record', async () => {
      const sessionId = await createSession(mockPool, 'user-1', '1.2.3.4', 'Mozilla/5.0');
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO auth.sessions'),
        expect.arrayContaining(['user-1', '1.2.3.4', 'Mozilla/5.0']),
      );
    });
  });

  describe('deactivateSession', () => {
    it('deactivates a specific session', async () => {
      await deactivateSession(mockPool, 'session-id');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SET is_active = false'),
        ['session-id'],
      );
    });
  });

  describe('deactivateAllSessions', () => {
    it('deactivates all sessions for a user', async () => {
      await deactivateAllSessions(mockPool, 'user-id');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SET is_active = false WHERE user_id'),
        ['user-id'],
      );
    });
  });
});
