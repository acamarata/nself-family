import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  describe('hashPassword', () => {
    it('produces a bcrypt hash', async () => {
      const hash = await hashPassword('test-password');
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it('produces different hashes for same input (salt)', async () => {
      const hash1 = await hashPassword('test-password');
      const hash2 = await hashPassword('test-password');
      expect(hash1).not.toBe(hash2);
    });

    it('respects custom rounds', async () => {
      const hash = await hashPassword('test', 4);
      expect(hash).toMatch(/^\$2b\$04\$/);
    });
  });

  describe('verifyPassword', () => {
    it('returns true for correct password', async () => {
      const hash = await hashPassword('correct-password', 4);
      const result = await verifyPassword('correct-password', hash);
      expect(result).toBe(true);
    });

    it('returns false for incorrect password', async () => {
      const hash = await hashPassword('correct-password', 4);
      const result = await verifyPassword('wrong-password', hash);
      expect(result).toBe(false);
    });
  });
});
