import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGenealogyProfile, getGenealogyProfiles, validateRelationshipGraph, detectDuplicates } from './genealogy.js';

const mockPool = {
  query: vi.fn(),
} as any;

describe('genealogy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createGenealogyProfile', () => {
    it('creates a profile', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'gp1' }] });
      const id = await createGenealogyProfile(mockPool, {
        family_id: 'f1',
        full_name: 'John Smith',
        gender: 'male',
        birth_date: '1950-01-15',
      });
      expect(id).toBe('gp1');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO public.genealogy_profiles'),
        expect.arrayContaining(['f1', 'John Smith']),
      );
    });

    it('handles optional fields', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'gp2' }] });
      const id = await createGenealogyProfile(mockPool, {
        family_id: 'f1',
        full_name: 'Unknown Person',
      });
      expect(id).toBe('gp2');
    });
  });

  describe('getGenealogyProfiles', () => {
    it('returns profiles for family', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'gp1', full_name: 'Alice' },
          { id: 'gp2', full_name: 'Bob' },
        ],
      });
      const profiles = await getGenealogyProfiles(mockPool, 'f1');
      expect(profiles).toHaveLength(2);
      expect(profiles[0].full_name).toBe('Alice');
    });
  });

  describe('validateRelationshipGraph', () => {
    it('returns empty for valid graph', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // no contradictions
        .mockResolvedValueOnce({ rows: [] }); // no self-relationships
      const conflicts = await validateRelationshipGraph(mockPool, 'f1');
      expect(conflicts).toHaveLength(0);
    });

    it('detects contradictory relationships', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ user_a_id: 'u1', user_b_id: 'u2', type1: 'parent', type2: 'parent' }],
        })
        .mockResolvedValueOnce({ rows: [] });
      const conflicts = await validateRelationshipGraph(mockPool, 'f1');
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0]).toContain('Contradictory');
    });

    it('detects self-relationships', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'r1', user_a_id: 'u1' }] });
      const conflicts = await validateRelationshipGraph(mockPool, 'f1');
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0]).toContain('Self-relationship');
    });
  });

  describe('detectDuplicates', () => {
    it('finds duplicates by name', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'gp1' }] });
      const dupes = await detectDuplicates(mockPool, 'f1', 'John Smith');
      expect(dupes).toEqual(['gp1']);
    });

    it('returns empty when no duplicates', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const dupes = await detectDuplicates(mockPool, 'f1', 'Unique Name');
      expect(dupes).toEqual([]);
    });
  });
});
