import { describe, it, expect, vi } from 'vitest';
import { updateLocation, getActiveLocations, isInsideGeofence, cleanupExpiredLocations } from './location';

function mockPool(rows: unknown[] = [], overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows, ...overrides }),
  } as any;
}

describe('location', () => {
  describe('updateLocation', () => {
    it('inserts location share with default duration', async () => {
      const pool = mockPool([{ id: 'loc-1' }]);
      const result = await updateLocation(pool, {
        user_id: 'user-1',
        family_id: 'fam-1',
        latitude: 40.7128,
        longitude: -74.006,
      });
      expect(result).toBe('loc-1');
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO public.location_shares');
      expect(params[0]).toBe('user-1');
      expect(params[1]).toBe('fam-1');
      expect(params[2]).toBe(40.7128);
      expect(params[3]).toBe(-74.006);
      expect(params[8]).toBe(1); // default duration_hours
    });

    it('inserts location share with custom duration and optional fields', async () => {
      const pool = mockPool([{ id: 'loc-2' }]);
      await updateLocation(pool, {
        user_id: 'user-2',
        family_id: 'fam-1',
        latitude: 51.5074,
        longitude: -0.1278,
        accuracy: 10,
        altitude: 100,
        heading: 180,
        speed: 5.5,
        duration_hours: 4,
      });
      const params = pool.query.mock.calls[0][1];
      expect(params[4]).toBe(10);   // accuracy
      expect(params[5]).toBe(100);  // altitude
      expect(params[6]).toBe(180);  // heading
      expect(params[7]).toBe(5.5);  // speed
      expect(params[8]).toBe(4);    // duration_hours
    });

    it('sets nulls for omitted optional fields', async () => {
      const pool = mockPool([{ id: 'loc-3' }]);
      await updateLocation(pool, {
        user_id: 'user-3',
        family_id: 'fam-1',
        latitude: 0,
        longitude: 0,
      });
      const params = pool.query.mock.calls[0][1];
      expect(params[4]).toBeNull(); // accuracy
      expect(params[5]).toBeNull(); // altitude
      expect(params[6]).toBeNull(); // heading
      expect(params[7]).toBeNull(); // speed
    });
  });

  describe('getActiveLocations', () => {
    it('queries non-expired locations for family', async () => {
      const rows = [
        { user_id: 'u1', latitude: 40.7, longitude: -74, display_name: 'Alice', avatar_url: null },
        { user_id: 'u2', latitude: 51.5, longitude: -0.1, display_name: 'Bob', avatar_url: 'https://img.example.com/bob.jpg' },
      ];
      const pool = mockPool(rows);
      const result = await getActiveLocations(pool, 'fam-1');
      expect(result).toHaveLength(2);
      expect(result[0].display_name).toBe('Alice');
      expect(result[1].display_name).toBe('Bob');
      const sql = pool.query.mock.calls[0][0];
      expect(sql).toContain('DISTINCT ON');
      expect(sql).toContain('expires_at > now()');
    });

    it('returns empty array when no active shares', async () => {
      const pool = mockPool([]);
      const result = await getActiveLocations(pool, 'fam-1');
      expect(result).toEqual([]);
    });
  });

  describe('isInsideGeofence', () => {
    it('returns true for point at center', () => {
      expect(isInsideGeofence(40.7128, -74.006, 40.7128, -74.006, 100)).toBe(true);
    });

    it('returns true for point within radius', () => {
      // ~111m apart (0.001 degree latitude ≈ 111m)
      expect(isInsideGeofence(40.7128, -74.006, 40.7129, -74.006, 200)).toBe(true);
    });

    it('returns false for point outside radius', () => {
      // ~11.1km apart (0.1 degree latitude ≈ 11.1km)
      expect(isInsideGeofence(40.7128, -74.006, 40.8128, -74.006, 100)).toBe(false);
    });

    it('returns true for point exactly on radius boundary', () => {
      // Calculate exact distance and use that as radius
      const result = isInsideGeofence(0, 0, 0, 0, 0);
      expect(result).toBe(true);
    });

    it('handles negative coordinates', () => {
      // Sydney, Australia
      expect(isInsideGeofence(-33.8688, 151.2093, -33.8688, 151.2093, 10)).toBe(true);
    });

    it('works across hemispheres', () => {
      // NYC to London — ~5500km apart
      expect(isInsideGeofence(40.7128, -74.006, 51.5074, -0.1278, 100)).toBe(false);
      expect(isInsideGeofence(40.7128, -74.006, 51.5074, -0.1278, 10_000_000)).toBe(true);
    });
  });

  describe('cleanupExpiredLocations', () => {
    it('deletes expired records and returns count', async () => {
      const pool = mockPool([], { rowCount: 5 });
      const result = await cleanupExpiredLocations(pool);
      expect(result).toBe(5);
      const sql = pool.query.mock.calls[0][0];
      expect(sql).toContain('DELETE FROM public.location_shares');
      expect(sql).toContain('expires_at < now()');
    });

    it('returns 0 when no expired records', async () => {
      const pool = mockPool([], { rowCount: 0 });
      const result = await cleanupExpiredLocations(pool);
      expect(result).toBe(0);
    });

    it('handles null rowCount', async () => {
      const pool = mockPool([], { rowCount: null });
      const result = await cleanupExpiredLocations(pool);
      expect(result).toBe(0);
    });
  });
});
