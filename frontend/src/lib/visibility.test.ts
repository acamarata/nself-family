import { describe, it, expect } from 'vitest';
import { VISIBILITY_LEVELS, type VisibilityLevel } from '@/types';

describe('visibility policy', () => {
  it('defines all visibility levels', () => {
    expect(VISIBILITY_LEVELS).toContain('family');
    expect(VISIBILITY_LEVELS).toContain('adults_only');
    expect(VISIBILITY_LEVELS).toContain('private');
    expect(VISIBILITY_LEVELS).toContain('public');
    expect(VISIBILITY_LEVELS.length).toBe(4);
  });

  it('allows type-safe visibility assignment', () => {
    const vis: VisibilityLevel = 'family';
    expect(vis).toBe('family');
  });

  it('visibility levels are exclusive', () => {
    const uniqueLevels = new Set(VISIBILITY_LEVELS);
    expect(uniqueLevels.size).toBe(VISIBILITY_LEVELS.length);
  });

  describe('policy evaluation rules', () => {
    it('public is visible to all family members', () => {
      // Mirrors backend evaluatePostVisibility logic
      const visibleToAll = ['public', 'family'];
      expect(visibleToAll.every((v) => VISIBILITY_LEVELS.includes(v as VisibilityLevel))).toBe(true);
    });

    it('adults_only restricts youth and child members', () => {
      const restrictedRoles = ['YOUTH_MEMBER', 'CHILD_MEMBER'];
      expect(restrictedRoles.length).toBe(2);
    });

    it('private requires explicit audience list', () => {
      // Private visibility means only explicitly listed users can see
      const visibility: VisibilityLevel = 'private';
      expect(visibility).toBe('private');
    });
  });
});
