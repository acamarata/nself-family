import { describe, it, expect, vi } from 'vitest';
import {
  trackUsage, getUsageMetrics, setQuotaLimit, checkQuota,
  setEntitlement, getEntitlements, mapRoleToEntitlements,
} from './analytics';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = '550e8400-e29b-41d4-a716-446655440001';

function createMockPool(overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows: [{ id: UUID }], rowCount: 1 }),
    ...overrides,
  } as never;
}

describe('analytics service', () => {
  describe('trackUsage', () => {
    it('tracks a new metric', async () => {
      const pool = createMockPool();
      const id = await trackUsage(pool, {
        family_id: UUID, metric_type: 'storage_bytes', value: 1024000,
        period_start: '2025-06-01', period_end: '2025-06-30',
      });
      expect(id).toBe(UUID);
    });

    it('updates existing metric on conflict', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [] }) // conflict, no insert
          .mockResolvedValueOnce({ rows: [{ id: UUID }] }), // update
      });
      const id = await trackUsage(pool, {
        family_id: UUID, metric_type: 'api_calls', value: 50,
        period_start: '2025-06-01', period_end: '2025-06-30',
      });
      expect(id).toBe(UUID);
    });
  });

  describe('getUsageMetrics', () => {
    it('returns metrics for family', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({
          rows: [{ metric_type: 'storage_bytes', value: 5000000 }],
        }),
      });
      const metrics = await getUsageMetrics(pool, UUID);
      expect(metrics).toHaveLength(1);
    });

    it('filters by metric type', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [] }),
      });
      await getUsageMetrics(pool, UUID, 'stream_minutes');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('metric_type'),
        expect.arrayContaining(['stream_minutes']),
      );
    });
  });

  describe('setQuotaLimit', () => {
    it('sets a quota limit', async () => {
      const pool = createMockPool();
      const id = await setQuotaLimit(pool, {
        family_id: UUID, metric_type: 'storage_bytes',
        soft_limit: 5_000_000_000, hard_limit: 10_000_000_000,
      });
      expect(id).toBe(UUID);
    });

    it('sets a global default quota', async () => {
      const pool = createMockPool();
      await setQuotaLimit(pool, {
        metric_type: 'api_calls',
        soft_limit: 10000, hard_limit: 50000,
        alert_threshold_pct: 90,
      });
      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([null, 'api_calls']),
      );
    });
  });

  describe('checkQuota', () => {
    it('reports under limit', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ current_value: 1000 }] })
          .mockResolvedValueOnce({ rows: [{ soft_limit: 5000, hard_limit: 10000, alert_threshold_pct: 80 }] }),
      });
      const result = await checkQuota(pool, UUID, 'storage_bytes');
      expect(result.exceeded_soft).toBe(false);
      expect(result.exceeded_hard).toBe(false);
      expect(result.usage_pct).toBe(10);
    });

    it('reports soft limit exceeded', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ current_value: 6000 }] })
          .mockResolvedValueOnce({ rows: [{ soft_limit: 5000, hard_limit: 10000, alert_threshold_pct: 80 }] }),
      });
      const result = await checkQuota(pool, UUID, 'storage_bytes');
      expect(result.exceeded_soft).toBe(true);
      expect(result.exceeded_hard).toBe(false);
    });

    it('reports hard limit exceeded', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ current_value: 15000 }] })
          .mockResolvedValueOnce({ rows: [{ soft_limit: 5000, hard_limit: 10000, alert_threshold_pct: 80 }] }),
      });
      const result = await checkQuota(pool, UUID, 'storage_bytes');
      expect(result.exceeded_hard).toBe(true);
      expect(result.usage_pct).toBe(150);
    });

    it('handles no limit configured', async () => {
      const pool = createMockPool({
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ current_value: 100 }] })
          .mockResolvedValueOnce({ rows: [] }), // no limit
      });
      const result = await checkQuota(pool, UUID, 'unknown_metric');
      expect(result.exceeded_soft).toBe(false);
      expect(result.exceeded_hard).toBe(false);
    });
  });

  describe('entitlements', () => {
    it('sets an entitlement', async () => {
      const pool = createMockPool();
      const id = await setEntitlement(pool, {
        family_id: UUID, user_id: UUID2,
        claim_type: 'can_watch', claim_value: 'true',
      });
      expect(id).toBe(UUID);
    });

    it('gets user entitlements', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({
          rows: [
            { claim_type: 'can_watch', claim_value: 'true' },
            { claim_type: 'max_streams', claim_value: '3' },
          ],
        }),
      });
      const entitlements = await getEntitlements(pool, UUID, UUID2);
      expect(entitlements).toHaveLength(2);
    });
  });

  describe('mapRoleToEntitlements', () => {
    it('maps OWNER role', () => {
      const claims = mapRoleToEntitlements('OWNER');
      expect(claims.find((c) => c.claim_type === 'can_watch')?.claim_value).toBe('true');
      expect(claims.find((c) => c.claim_type === 'can_record')?.claim_value).toBe('true');
      expect(claims.find((c) => c.claim_type === 'parental_level')?.claim_value).toBe('unrestricted');
      expect(claims.find((c) => c.claim_type === 'max_streams')?.claim_value).toBe('5');
    });

    it('maps CHILD_MEMBER role', () => {
      const claims = mapRoleToEntitlements('CHILD_MEMBER');
      expect(claims.find((c) => c.claim_type === 'can_record')?.claim_value).toBe('false');
      expect(claims.find((c) => c.claim_type === 'parental_level')?.claim_value).toBe('child');
      expect(claims.find((c) => c.claim_type === 'max_streams')?.claim_value).toBe('1');
    });

    it('maps unknown role with base entitlements', () => {
      const claims = mapRoleToEntitlements('DEVICE');
      expect(claims).toHaveLength(1);
      expect(claims[0].claim_type).toBe('can_watch');
    });
  });
});
