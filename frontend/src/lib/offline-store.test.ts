import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isOnline, getCached, setCache, clearCacheKey, clearAllCache,
  saveDraft, getDraft, deleteDraft, getAllDrafts,
  getSyncQueue, enqueueAction, dequeueAction, updateActionStatus,
  getPendingActionCount, clearSyncQueue, processQueue,
} from './offline-store';

// Mock localStorage
const storage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete storage[key]; }),
  get length() { return Object.keys(storage).length; },
  key: vi.fn((index: number) => Object.keys(storage)[index] ?? null),
});

vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).slice(2, 8)),
});

describe('offline-store', () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    vi.clearAllMocks();
  });

  describe('isOnline', () => {
    it('returns a boolean', () => {
      expect(typeof isOnline()).toBe('boolean');
    });
  });

  describe('read cache', () => {
    it('returns null for missing key', () => {
      expect(getCached('nonexistent')).toBeNull();
    });

    it('caches and retrieves data', () => {
      setCache('test', { foo: 'bar' });
      const result = getCached<{ foo: string }>('test');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('returns null for expired cache', () => {
      // Set cache with 0ms TTL (already expired)
      const key = 'nfamily_cache_expired';
      storage[key] = JSON.stringify({
        data: 'old',
        expires_at: new Date(Date.now() - 1000).toISOString(),
      });
      expect(getCached('expired')).toBeNull();
    });

    it('clears a specific key', () => {
      setCache('to-clear', 'data');
      clearCacheKey('to-clear');
      expect(getCached('to-clear')).toBeNull();
    });

    it('clears all cache', () => {
      setCache('one', 1);
      setCache('two', 2);
      clearAllCache();
      expect(getCached('one')).toBeNull();
      expect(getCached('two')).toBeNull();
    });

    it('handles corrupted cache gracefully', () => {
      storage['nfamily_cache_bad'] = 'not json';
      expect(getCached('bad')).toBeNull();
    });
  });

  describe('drafts', () => {
    it('saves and retrieves a draft', () => {
      saveDraft('post', 'draft-1', { title: 'My Post', body: 'Content' });
      const draft = getDraft('post', 'draft-1');
      expect(draft).not.toBeNull();
      expect(draft!.content).toEqual({ title: 'My Post', body: 'Content' });
      expect(draft!.saved_at).toBeTruthy();
    });

    it('returns null for missing draft', () => {
      expect(getDraft('post', 'nonexistent')).toBeNull();
    });

    it('deletes a draft', () => {
      saveDraft('post', 'draft-2', { title: 'To Delete' });
      deleteDraft('post', 'draft-2');
      expect(getDraft('post', 'draft-2')).toBeNull();
    });

    it('gets all drafts of a type', () => {
      saveDraft('message', 'msg-1', { content: 'Hello' });
      saveDraft('message', 'msg-2', { content: 'World' });
      saveDraft('post', 'post-1', { title: 'Different type' });
      const drafts = getAllDrafts('message');
      expect(drafts).toHaveLength(2);
    });
  });

  describe('sync queue', () => {
    it('starts with empty queue', () => {
      expect(getSyncQueue()).toEqual([]);
    });

    it('enqueues an action', () => {
      const id = enqueueAction('create_post', { title: 'Offline Post' });
      expect(id).toBeTruthy();
      const queue = getSyncQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe('create_post');
      expect(queue[0].status).toBe('pending');
    });

    it('dequeues an action', () => {
      const id = enqueueAction('send_message', { content: 'Hello' });
      dequeueAction(id);
      expect(getSyncQueue()).toHaveLength(0);
    });

    it('updates action status', () => {
      const id = enqueueAction('rsvp', { event_id: 'e1' });
      updateActionStatus(id, 'processing');
      expect(getSyncQueue()[0].status).toBe('processing');
    });

    it('increments retries on failure', () => {
      const id = enqueueAction('rsvp', { event_id: 'e1' });
      updateActionStatus(id, 'failed');
      expect(getSyncQueue()[0].retries).toBe(1);
      updateActionStatus(id, 'failed');
      expect(getSyncQueue()[0].retries).toBe(2);
    });

    it('counts pending actions', () => {
      enqueueAction('a', {});
      enqueueAction('b', {});
      const id = enqueueAction('c', {});
      updateActionStatus(id, 'failed');
      expect(getPendingActionCount()).toBe(2);
    });

    it('clears the queue', () => {
      enqueueAction('a', {});
      enqueueAction('b', {});
      clearSyncQueue();
      expect(getSyncQueue()).toEqual([]);
    });
  });

  describe('processQueue', () => {
    it('processes pending actions', async () => {
      enqueueAction('create_post', { title: 'P1' });
      enqueueAction('send_message', { content: 'M1' });
      const results = await processQueue(async () => ({ success: true }));
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
      expect(getSyncQueue()).toHaveLength(0);
    });

    it('handles failed actions', async () => {
      enqueueAction('create_post', { title: 'Fail' });
      const results = await processQueue(async () => ({
        success: false, error: 'Server error',
      }));
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(getSyncQueue()[0].status).toBe('failed');
    });

    it('handles conflicts', async () => {
      enqueueAction('update_post', { id: 'p1' });
      const results = await processQueue(async () => ({
        success: false, conflicted: true, error: 'Conflict',
      }));
      expect(results[0].conflicted).toBe(true);
    });

    it('handles processor exceptions', async () => {
      enqueueAction('create_post', { title: 'Throw' });
      const results = await processQueue(async () => {
        throw new Error('Network error');
      });
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Network error');
    });

    it('skips non-pending actions', async () => {
      const id = enqueueAction('create_post', { title: 'P1' });
      updateActionStatus(id, 'failed');
      const processor = vi.fn().mockResolvedValue({ success: true });
      const results = await processQueue(processor);
      expect(results).toHaveLength(0);
      expect(processor).not.toHaveBeenCalled();
    });
  });
});
