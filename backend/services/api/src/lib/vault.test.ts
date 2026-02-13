import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createVault, getVaults, getVaultDetail, sealVault, releaseVault,
  addVaultItem, removeVaultItem, addVaultRecipient, removeVaultRecipient,
  getReleasedVaultsForUser, markVaultViewed,
  createInheritanceScenario, getInheritanceScenarios,
  setDigitalSuccessor, getDigitalSuccessor, confirmSuccessor,
  requestMemorial, approveMemorial, getMemorialProfile,
  processTimeTriggeredReleases,
} from './vault';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = '550e8400-e29b-41d4-a716-446655440001';
const UUID3 = '550e8400-e29b-41d4-a716-446655440002';

function createMockPool(overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows: [{ id: UUID }], rowCount: 1 }),
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [{ id: UUID }], rowCount: 1 }),
      release: vi.fn(),
    }),
    ...overrides,
  } as never;
}

describe('vault service', () => {
  describe('createVault', () => {
    it('creates a vault with default release condition', async () => {
      const pool = createMockPool();
      const id = await createVault(pool, {
        family_id: UUID, owner_id: UUID2, title: 'My Legacy',
      });
      expect(id).toBe(UUID);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO legacy_vaults'),
        expect.arrayContaining([UUID, UUID2, 'My Legacy']),
      );
    });

    it('creates a vault with time trigger', async () => {
      const pool = createMockPool();
      await createVault(pool, {
        family_id: UUID, owner_id: UUID2, title: 'Timed Vault',
        release_condition: 'time_trigger', release_trigger_at: '2030-01-01T00:00:00Z',
      });
      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['time_trigger', '2030-01-01T00:00:00Z']),
      );
    });
  });

  describe('getVaults', () => {
    it('returns vaults for owner', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [{ id: UUID, title: 'V1' }], rowCount: 1 }),
      });
      const vaults = await getVaults(pool, UUID2);
      expect(vaults).toHaveLength(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE owner_id'),
        [UUID2],
      );
    });
  });

  describe('getVaultDetail', () => {
    it('returns vault with items and recipients', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: UUID, title: 'V1', status: 'active' }] })
          .mockResolvedValueOnce({ rows: [{ id: 'item-1', content_type: 'letter' }] })
          .mockResolvedValueOnce({ rows: [{ id: 'rec-1', user_id: UUID2 }] }),
      });
      const detail = await getVaultDetail(pool, UUID);
      expect(detail).not.toBeNull();
      expect(detail!.items).toHaveLength(1);
      expect(detail!.recipients).toHaveLength(1);
    });

    it('returns null for non-existent vault', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [] }),
      });
      const detail = await getVaultDetail(pool, 'nonexistent');
      expect(detail).toBeNull();
    });
  });

  describe('sealVault', () => {
    it('seals an active vault', async () => {
      const pool = createMockPool();
      const result = await sealVault(pool, UUID, UUID2);
      expect(result).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'sealed'"),
        [UUID, UUID2],
      );
    });

    it('returns false if vault not found or not active', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      });
      const result = await sealVault(pool, UUID, UUID2);
      expect(result).toBe(false);
    });
  });

  describe('releaseVault', () => {
    it('releases a vault', async () => {
      const pool = createMockPool();
      const result = await releaseVault(pool, UUID);
      expect(result).toBe(true);
    });
  });

  describe('addVaultItem', () => {
    it('adds item to active vault', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ status: 'active' }] })
          .mockResolvedValueOnce({ rows: [{ id: 'item-1' }] }),
      });
      const id = await addVaultItem(pool, {
        vault_id: UUID, content_type: 'letter', title: 'Final Letter',
        content: 'Dear family...',
      });
      expect(id).toBe('item-1');
    });

    it('returns null for sealed vault', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [{ status: 'sealed' }] }),
      });
      const id = await addVaultItem(pool, {
        vault_id: UUID, content_type: 'letter',
      });
      expect(id).toBeNull();
    });

    it('returns null for non-existent vault', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [] }),
      });
      const id = await addVaultItem(pool, {
        vault_id: UUID, content_type: 'letter',
      });
      expect(id).toBeNull();
    });
  });

  describe('removeVaultItem', () => {
    it('removes item from active vault', async () => {
      const pool = createMockPool();
      const result = await removeVaultItem(pool, 'item-1', UUID);
      expect(result).toBe(true);
    });
  });

  describe('vault recipients', () => {
    it('adds a recipient', async () => {
      const pool = createMockPool();
      const id = await addVaultRecipient(pool, {
        vault_id: UUID, user_id: UUID2, message: 'With love',
      });
      expect(id).toBe(UUID);
    });

    it('removes a recipient', async () => {
      const pool = createMockPool();
      const result = await removeVaultRecipient(pool, UUID, UUID2);
      expect(result).toBe(true);
    });
  });

  describe('getReleasedVaultsForUser', () => {
    it('returns released vaults for recipient', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({
          rows: [{ id: UUID, title: 'Released Vault', status: 'released' }],
        }),
      });
      const vaults = await getReleasedVaultsForUser(pool, UUID2);
      expect(vaults).toHaveLength(1);
    });
  });

  describe('markVaultViewed', () => {
    it('marks vault as viewed', async () => {
      const pool = createMockPool();
      await markVaultViewed(pool, UUID, UUID2);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('viewed_at'),
        [UUID, UUID2],
      );
    });
  });

  describe('inheritance scenarios', () => {
    it('creates a versioned scenario', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ max_version: 2 }] })
          .mockResolvedValueOnce({ rows: [{ id: UUID }] }),
      });
      const id = await createInheritanceScenario(pool, {
        family_id: UUID, owner_id: UUID2,
        input_snapshot: { vaults: 2, recipients: 3 },
        output_snapshot: { distribution: 'even' },
      });
      expect(id).toBe(UUID);
      // Should insert version 3
      expect(pool.query).toHaveBeenLastCalledWith(
        expect.stringContaining('INSERT INTO inheritance_scenarios'),
        expect.arrayContaining([3]),
      );
    });

    it('starts at version 1 for first scenario', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ max_version: 0 }] })
          .mockResolvedValueOnce({ rows: [{ id: UUID }] }),
      });
      await createInheritanceScenario(pool, {
        family_id: UUID, owner_id: UUID2,
        input_snapshot: {}, output_snapshot: {},
      });
      expect(pool.query).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.arrayContaining([1]),
      );
    });

    it('gets scenarios ordered by version', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({
          rows: [{ version: 3 }, { version: 2 }, { version: 1 }],
        }),
      });
      const scenarios = await getInheritanceScenarios(pool, UUID, UUID2);
      expect(scenarios).toHaveLength(3);
    });
  });

  describe('digital successor', () => {
    it('sets a successor', async () => {
      const pool = createMockPool();
      const id = await setDigitalSuccessor(pool, {
        family_id: UUID, owner_id: UUID2, successor_id: UUID3,
        after_death_action: 'memorialize',
      });
      expect(id).toBe(UUID);
    });

    it('gets a successor', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({
          rows: [{ owner_id: UUID2, successor_id: UUID3, display_name: 'John' }],
        }),
      });
      const successor = await getDigitalSuccessor(pool, UUID, UUID2);
      expect(successor).not.toBeNull();
      expect(successor.successor_id).toBe(UUID3);
    });

    it('returns null when no successor set', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [] }),
      });
      const successor = await getDigitalSuccessor(pool, UUID, UUID2);
      expect(successor).toBeNull();
    });

    it('confirms successor responsibility', async () => {
      const pool = createMockPool();
      const result = await confirmSuccessor(pool, UUID, UUID2, UUID3);
      expect(result).toBe(true);
    });
  });

  describe('memorialization', () => {
    it('requests memorialization', async () => {
      const pool = createMockPool();
      const id = await requestMemorial(pool, {
        user_id: UUID, family_id: UUID2, requested_by: UUID3,
        memorial_message: 'In loving memory',
      });
      expect(id).toBe(UUID);
    });

    it('approves memorialization', async () => {
      const pool = createMockPool();
      const result = await approveMemorial(pool, UUID, UUID3);
      expect(result).toBe(true);
    });

    it('returns false if not in pending state', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rowCount: 0 }),
      });
      const result = await approveMemorial(pool, UUID, UUID3);
      expect(result).toBe(false);
    });

    it('gets memorial profile', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({
          rows: [{ user_id: UUID, state: 'memorialized' }],
        }),
      });
      const profile = await getMemorialProfile(pool, UUID);
      expect(profile).not.toBeNull();
      expect(profile.state).toBe('memorialized');
    });

    it('returns null for no memorial profile', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [] }),
      });
      const profile = await getMemorialProfile(pool, UUID);
      expect(profile).toBeNull();
    });
  });

  describe('processTimeTriggeredReleases', () => {
    it('releases time-triggered vaults', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rowCount: 3 }),
      });
      const count = await processTimeTriggeredReleases(pool);
      expect(count).toBe(3);
    });

    it('returns 0 when no vaults to release', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rowCount: 0 }),
      });
      const count = await processTimeTriggeredReleases(pool);
      expect(count).toBe(0);
    });
  });
});
