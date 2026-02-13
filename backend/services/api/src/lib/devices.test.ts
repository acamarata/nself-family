import { describe, it, expect, vi } from 'vitest';
import {
  registerDevice, validateAndIssueCredential, deviceHeartbeat,
  revokeDevice, getFamilyDevices, createPairingCode,
  confirmPairingCode, getDeviceCount,
} from './devices';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = '550e8400-e29b-41d4-a716-446655440001';

function createMockPool(overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows: [{ id: UUID }], rowCount: 1 }),
    ...overrides,
  } as never;
}

describe('devices service', () => {
  describe('registerDevice', () => {
    it('registers a new device with bootstrap token', async () => {
      const pool = createMockPool();
      const result = await registerDevice(pool, {
        family_id: UUID, user_id: UUID2, device_name: 'Living Room TV',
        device_type: 'tv',
      });
      expect(result.id).toBe(UUID);
      expect(result.bootstrap_token).toBeTruthy();
      expect(result.bootstrap_token.length).toBe(64); // 32 bytes hex
    });
  });

  describe('validateAndIssueCredential', () => {
    it('issues credential for valid bootstrap token', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: UUID, bootstrap_token: 'valid-token' }] })
          .mockResolvedValueOnce({ rows: [], rowCount: 1 }),
      });
      const credential = await validateAndIssueCredential(pool, UUID, 'valid-token');
      expect(credential).toBeTruthy();
      expect(credential!.length).toBe(96); // 48 bytes hex
    });

    it('rejects invalid bootstrap token', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({
          rows: [{ id: UUID, bootstrap_token: 'correct-token' }],
        }),
      });
      const credential = await validateAndIssueCredential(pool, UUID, 'wrong-token');
      expect(credential).toBeNull();
    });

    it('rejects non-existent device', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [] }),
      });
      const credential = await validateAndIssueCredential(pool, UUID, 'any-token');
      expect(credential).toBeNull();
    });
  });

  describe('deviceHeartbeat', () => {
    it('updates heartbeat for trusted device', async () => {
      const pool = createMockPool();
      const result = await deviceHeartbeat(pool, UUID, { cpu: 45, memory: 70 });
      expect(result).toBe(true);
    });

    it('returns false for revoked device', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rowCount: 0 }),
      });
      const result = await deviceHeartbeat(pool, UUID);
      expect(result).toBe(false);
    });
  });

  describe('revokeDevice', () => {
    it('revokes a device', async () => {
      const pool = createMockPool();
      const result = await revokeDevice(pool, UUID);
      expect(result).toBe(true);
    });
  });

  describe('getFamilyDevices', () => {
    it('returns all family devices', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({
          rows: [
            { id: '1', device_name: 'TV', device_type: 'tv' },
            { id: '2', device_name: 'Phone', device_type: 'mobile' },
          ],
        }),
      });
      const devices = await getFamilyDevices(pool, UUID);
      expect(devices).toHaveLength(2);
    });
  });

  describe('createPairingCode', () => {
    it('creates a pairing code', async () => {
      const pool = createMockPool();
      const result = await createPairingCode(pool, UUID);
      expect(result.code).toBeTruthy();
      expect(result.code.length).toBe(6);
      expect(result.expires_at).toBeTruthy();
    });
  });

  describe('confirmPairingCode', () => {
    it('confirms a valid pairing code', async () => {
      const pool = createMockPool();
      const token = await confirmPairingCode(pool, 'ABC123', UUID2);
      expect(token).toBeTruthy();
    });

    it('returns null for expired/invalid code', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rowCount: 0 }),
      });
      const token = await confirmPairingCode(pool, 'INVALID', UUID2);
      expect(token).toBeNull();
    });
  });

  describe('getDeviceCount', () => {
    it('returns total and active counts', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({
          rows: [{ total: 5, active: 3 }],
        }),
      });
      const counts = await getDeviceCount(pool, UUID);
      expect(counts.total).toBe(5);
      expect(counts.active).toBe(3);
    });
  });
});
