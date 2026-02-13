import { describe, it, expect, vi } from 'vitest';
import {
  indexContent, removeFromIndex, search, searchCount,
  logActivity, getActivityFeed, bulkIndex, getSearchFacets,
} from './search';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = '550e8400-e29b-41d4-a716-446655440001';

function createMockPool(overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows: [{ id: UUID }], rowCount: 1 }),
    ...overrides,
  } as never;
}

describe('search service', () => {
  describe('indexContent', () => {
    it('indexes new content', async () => {
      const pool = createMockPool();
      const id = await indexContent(pool, {
        family_id: UUID, content_type: 'post', content_id: UUID2,
        title: 'Family BBQ', body: 'Great time at the park',
        author_id: UUID, visibility: 'family',
      });
      expect(id).toBe(UUID);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO search_index'),
        expect.arrayContaining([UUID, 'post', UUID2]),
      );
    });

    it('upserts existing content', async () => {
      const pool = createMockPool();
      await indexContent(pool, {
        family_id: UUID, content_type: 'post', content_id: UUID2,
        title: 'Updated Title',
      });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.any(Array),
      );
    });
  });

  describe('removeFromIndex', () => {
    it('removes content from index', async () => {
      const pool = createMockPool();
      const result = await removeFromIndex(pool, 'post', UUID2);
      expect(result).toBe(true);
    });

    it('returns false for non-existent content', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rowCount: 0 }),
      });
      const result = await removeFromIndex(pool, 'post', UUID2);
      expect(result).toBe(false);
    });
  });

  describe('search', () => {
    it('performs full-text search', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({
          rows: [
            { id: UUID, content_type: 'post', title: 'BBQ Party', rank: 0.5, headline: '<mark>BBQ</mark> Party' },
          ],
        }),
      });
      const results = await search(pool, {
        family_id: UUID, query: 'BBQ',
      });
      expect(results).toHaveLength(1);
      expect(results[0].headline).toContain('<mark>');
    });

    it('filters by content type', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [] }),
      });
      await search(pool, {
        family_id: UUID, query: 'pasta',
        content_types: ['recipe'],
      });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('content_type = ANY'),
        expect.arrayContaining([['recipe']]),
      );
    });

    it('filters by author', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [] }),
      });
      await search(pool, {
        family_id: UUID, query: 'trip', author_id: UUID2,
      });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('author_id'),
        expect.arrayContaining([UUID2]),
      );
    });

    it('returns empty for empty query', async () => {
      const pool = createMockPool();
      const results = await search(pool, {
        family_id: UUID, query: '',
      });
      expect(results).toEqual([]);
    });

    it('handles multi-word queries', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [] }),
      });
      await search(pool, {
        family_id: UUID, query: 'family trip hawaii',
      });
      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['family & trip & hawaii']),
      );
    });

    it('applies limit and offset', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [] }),
      });
      await search(pool, {
        family_id: UUID, query: 'test', limit: 10, offset: 5,
      });
      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([10, 5]),
      );
    });
  });

  describe('searchCount', () => {
    it('returns total count', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [{ count: 42 }] }),
      });
      const count = await searchCount(pool, UUID, 'BBQ');
      expect(count).toBe(42);
    });

    it('returns 0 for empty query', async () => {
      const pool = createMockPool();
      const count = await searchCount(pool, UUID, '');
      expect(count).toBe(0);
    });

    it('filters by content types', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [{ count: 5 }] }),
      });
      const count = await searchCount(pool, UUID, 'pasta', ['recipe']);
      expect(count).toBe(5);
    });
  });

  describe('logActivity', () => {
    it('logs an activity event', async () => {
      const pool = createMockPool();
      const id = await logActivity(pool, {
        family_id: UUID, actor_id: UUID2, action: 'created_post',
        target_type: 'post', target_id: UUID,
        summary: 'Created a new post',
      });
      expect(id).toBe(UUID);
    });
  });

  describe('getActivityFeed', () => {
    it('returns recent activity', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({
          rows: [
            { id: '1', action: 'created_post', actor_name: 'Alice' },
            { id: '2', action: 'uploaded_photo', actor_name: 'Bob' },
          ],
        }),
      });
      const feed = await getActivityFeed(pool, UUID);
      expect(feed).toHaveLength(2);
    });

    it('respects pagination', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({ rows: [] }),
      });
      await getActivityFeed(pool, UUID, 10, 20);
      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        [UUID, 10, 20],
      );
    });
  });

  describe('bulkIndex', () => {
    it('indexes multiple items', async () => {
      const pool = createMockPool();
      const count = await bulkIndex(pool, [
        { family_id: UUID, content_type: 'post', content_id: '1', title: 'Post 1' },
        { family_id: UUID, content_type: 'post', content_id: '2', title: 'Post 2' },
        { family_id: UUID, content_type: 'recipe', content_id: '3', title: 'Recipe 1' },
      ]);
      expect(count).toBe(3);
    });

    it('returns 0 for empty array', async () => {
      const pool = createMockPool();
      const count = await bulkIndex(pool, []);
      expect(count).toBe(0);
    });
  });

  describe('getSearchFacets', () => {
    it('returns facet counts', async () => {
      const pool = createMockPool({
        query: vi.fn().mockResolvedValue({
          rows: [
            { content_type: 'post', count: 10 },
            { content_type: 'recipe', count: 5 },
            { content_type: 'event', count: 3 },
          ],
        }),
      });
      const facets = await getSearchFacets(pool, UUID, 'family');
      expect(facets).toEqual({ post: 10, recipe: 5, event: 3 });
    });

    it('returns empty for empty query', async () => {
      const pool = createMockPool();
      const facets = await getSearchFacets(pool, UUID, '');
      expect(facets).toEqual({});
    });
  });
});
