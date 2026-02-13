import { describe, it, expect } from 'vitest';
import { signAccessToken, verifyAccessToken, generateRefreshToken, decodeToken } from './jwt.js';

const TEST_SECRET = 'test-jwt-secret-minimum-32-chars-required!!';

describe('jwt', () => {
  describe('signAccessToken', () => {
    it('produces a valid JWT string', () => {
      const token = signAccessToken('user-123', 'test@example.com', 'session-456', TEST_SECRET, 900);
      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3);
    });

    it('includes correct claims', () => {
      const token = signAccessToken('user-123', 'test@example.com', 'session-456', TEST_SECRET, 900);
      const decoded = verifyAccessToken(token, TEST_SECRET);
      expect(decoded.sub).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.session_id).toBe('session-456');
    });

    it('includes Hasura claims', () => {
      const token = signAccessToken('user-123', 'test@example.com', 'session-456', TEST_SECRET, 900);
      const decoded = verifyAccessToken(token, TEST_SECRET) as Record<string, unknown>;
      const hasuraClaims = decoded['https://hasura.io/jwt/claims'] as Record<string, unknown>;
      expect(hasuraClaims).toBeDefined();
      expect(hasuraClaims['x-hasura-user-id']).toBe('user-123');
    });
  });

  describe('verifyAccessToken', () => {
    it('verifies a valid token', () => {
      const token = signAccessToken('user-123', 'test@example.com', 'session-456', TEST_SECRET, 900);
      const decoded = verifyAccessToken(token, TEST_SECRET);
      expect(decoded.sub).toBe('user-123');
    });

    it('throws on invalid token', () => {
      expect(() => verifyAccessToken('invalid-token', TEST_SECRET)).toThrow();
    });

    it('throws on wrong secret', () => {
      const token = signAccessToken('user-123', 'test@example.com', 'session-456', TEST_SECRET, 900);
      expect(() => verifyAccessToken(token, 'wrong-secret-that-is-at-least-32-chars!!')).toThrow();
    });

    it('throws on expired token', () => {
      const token = signAccessToken('user-123', 'test@example.com', 'session-456', TEST_SECRET, -1);
      expect(() => verifyAccessToken(token, TEST_SECRET)).toThrow();
    });
  });

  describe('generateRefreshToken', () => {
    it('generates a 64-char hex string', () => {
      const token = generateRefreshToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('generates unique tokens', () => {
      const tokens = new Set(Array.from({ length: 100 }, () => generateRefreshToken()));
      expect(tokens.size).toBe(100);
    });
  });

  describe('decodeToken', () => {
    it('decodes a valid token without verification', () => {
      const token = signAccessToken('user-123', 'test@example.com', 'session-456', TEST_SECRET, 900);
      const decoded = decodeToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe('user-123');
    });

    it('returns null for malformed token', () => {
      expect(decodeToken('not-a-jwt')).toBeNull();
    });
  });
});
