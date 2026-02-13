import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluatePostVisibility, getFamilySettings, updateFamilySettings } from './visibility.js';

const mockPool = {
  query: vi.fn(),
} as any;

describe('visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('evaluatePostVisibility', () => {
    it('denies when post not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const result = await evaluatePostVisibility(mockPool, 'p1', {
        viewerId: 'u1', viewerRole: 'ADULT_MEMBER', familyId: 'f1',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('post_not_found');
    });

    it('denies when not a family member', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ visibility: 'family', author_id: 'u2', family_id: 'f1', viewer_role: null, viewer_state: null, islamic_mode_enabled: false }],
      });
      const result = await evaluatePostVisibility(mockPool, 'p1', {
        viewerId: 'u1', viewerRole: 'ADULT_MEMBER', familyId: 'f1',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('not_family_member');
    });

    it('allows author to see own post', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ visibility: 'private', author_id: 'u1', family_id: 'f1', viewer_role: 'ADULT_MEMBER', viewer_state: 'active', islamic_mode_enabled: false }],
      });
      const result = await evaluatePostVisibility(mockPool, 'p1', {
        viewerId: 'u1', viewerRole: 'ADULT_MEMBER', familyId: 'f1',
      });
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('author');
    });

    it('allows family visibility for any member', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ visibility: 'family', author_id: 'u2', family_id: 'f1', viewer_role: 'ADULT_MEMBER', viewer_state: 'active', islamic_mode_enabled: false }],
      });
      const result = await evaluatePostVisibility(mockPool, 'p1', {
        viewerId: 'u1', viewerRole: 'ADULT_MEMBER', familyId: 'f1',
      });
      expect(result.allowed).toBe(true);
    });

    it('denies adults_only for youth members', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ visibility: 'adults_only', author_id: 'u2', family_id: 'f1', viewer_role: 'YOUTH_MEMBER', viewer_state: 'active', islamic_mode_enabled: false }],
      });
      const result = await evaluatePostVisibility(mockPool, 'p1', {
        viewerId: 'u3', viewerRole: 'YOUTH_MEMBER', familyId: 'f1',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('adults_only_content');
    });

    it('denies adults_only for child members', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ visibility: 'adults_only', author_id: 'u2', family_id: 'f1', viewer_role: 'CHILD_MEMBER', viewer_state: 'active', islamic_mode_enabled: false }],
      });
      const result = await evaluatePostVisibility(mockPool, 'p1', {
        viewerId: 'u3', viewerRole: 'CHILD_MEMBER', familyId: 'f1',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('adults_only_content');
    });

    it('allows private post for audience member', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ visibility: 'private', author_id: 'u2', family_id: 'f1', viewer_role: 'ADULT_MEMBER', viewer_state: 'active', islamic_mode_enabled: false }],
        })
        .mockResolvedValueOnce({ rows: [{ 1: 1 }] }); // audience check
      const result = await evaluatePostVisibility(mockPool, 'p1', {
        viewerId: 'u1', viewerRole: 'ADULT_MEMBER', familyId: 'f1',
      });
      expect(result.allowed).toBe(true);
    });

    it('denies private post for non-audience member', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ visibility: 'private', author_id: 'u2', family_id: 'f1', viewer_role: 'ADULT_MEMBER', viewer_state: 'active', islamic_mode_enabled: false }],
        })
        .mockResolvedValueOnce({ rows: [] }); // no audience entry
      const result = await evaluatePostVisibility(mockPool, 'p1', {
        viewerId: 'u1', viewerRole: 'ADULT_MEMBER', familyId: 'f1',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('not_in_audience');
    });
  });

  describe('getFamilySettings', () => {
    it('returns settings when found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ family_id: 'f1', islamic_mode_enabled: true }] });
      const settings = await getFamilySettings(mockPool, 'f1');
      expect(settings.islamic_mode_enabled).toBe(true);
    });

    it('returns null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const settings = await getFamilySettings(mockPool, 'f1');
      expect(settings).toBeNull();
    });
  });

  describe('updateFamilySettings', () => {
    it('inserts new settings', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // getFamilySettings returns null
        .mockResolvedValueOnce({ rows: [] }); // insert
      await updateFamilySettings(mockPool, 'f1', { islamic_mode_enabled: true }, 'u1');
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('updates existing settings', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ family_id: 'f1' }] }) // existing
        .mockResolvedValueOnce({ rows: [] }); // update
      await updateFamilySettings(mockPool, 'f1', { islamic_mode_enabled: false }, 'u1');
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });
});
