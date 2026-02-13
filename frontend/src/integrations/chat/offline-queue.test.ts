import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getQueuedMessages, enqueueMessage, dequeueMessage,
  updateQueueStatus, clearQueue, getPendingCount, isOnline,
} from './offline-queue';

// Mock localStorage
const storage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete storage[key]; }),
});

vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).slice(2, 8)),
});

describe('offline queue', () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    vi.clearAllMocks();
  });

  describe('getQueuedMessages', () => {
    it('returns empty array when no queue', () => {
      expect(getQueuedMessages()).toEqual([]);
    });

    it('returns queued messages', () => {
      storage['nfamily_offline_queue'] = JSON.stringify([
        { id: '1', conversation_id: 'c1', sender_id: 'u1', content: 'hi', message_type: 'text', queued_at: '2025-01-01', status: 'pending' },
      ]);
      expect(getQueuedMessages()).toHaveLength(1);
    });

    it('handles corrupted data gracefully', () => {
      storage['nfamily_offline_queue'] = 'invalid json';
      expect(getQueuedMessages()).toEqual([]);
    });
  });

  describe('enqueueMessage', () => {
    it('adds message to queue', () => {
      enqueueMessage({
        conversation_id: 'c1',
        sender_id: 'u1',
        content: 'Hello',
        message_type: 'text',
      });
      const queue = getQueuedMessages();
      expect(queue).toHaveLength(1);
      expect(queue[0].content).toBe('Hello');
      expect(queue[0].status).toBe('pending');
      expect(queue[0].id).toBeTruthy();
      expect(queue[0].queued_at).toBeTruthy();
    });

    it('appends to existing queue', () => {
      enqueueMessage({ conversation_id: 'c1', sender_id: 'u1', content: 'First', message_type: 'text' });
      enqueueMessage({ conversation_id: 'c1', sender_id: 'u1', content: 'Second', message_type: 'text' });
      expect(getQueuedMessages()).toHaveLength(2);
    });
  });

  describe('dequeueMessage', () => {
    it('removes message from queue', () => {
      storage['nfamily_offline_queue'] = JSON.stringify([
        { id: 'msg-1', conversation_id: 'c1', sender_id: 'u1', content: 'hi', message_type: 'text', queued_at: '2025-01-01', status: 'pending' },
        { id: 'msg-2', conversation_id: 'c1', sender_id: 'u1', content: 'bye', message_type: 'text', queued_at: '2025-01-01', status: 'pending' },
      ]);
      dequeueMessage('msg-1');
      const queue = getQueuedMessages();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('msg-2');
    });
  });

  describe('updateQueueStatus', () => {
    it('updates message status', () => {
      storage['nfamily_offline_queue'] = JSON.stringify([
        { id: 'msg-1', conversation_id: 'c1', sender_id: 'u1', content: 'hi', message_type: 'text', queued_at: '2025-01-01', status: 'pending' },
      ]);
      updateQueueStatus('msg-1', 'sending');
      const queue = getQueuedMessages();
      expect(queue[0].status).toBe('sending');
    });
  });

  describe('clearQueue', () => {
    it('removes all queued messages', () => {
      enqueueMessage({ conversation_id: 'c1', sender_id: 'u1', content: 'hi', message_type: 'text' });
      clearQueue();
      expect(getQueuedMessages()).toEqual([]);
    });
  });

  describe('getPendingCount', () => {
    it('counts pending messages', () => {
      storage['nfamily_offline_queue'] = JSON.stringify([
        { id: '1', status: 'pending' },
        { id: '2', status: 'sending' },
        { id: '3', status: 'pending' },
        { id: '4', status: 'failed' },
      ]);
      expect(getPendingCount()).toBe(2);
    });

    it('returns 0 for empty queue', () => {
      expect(getPendingCount()).toBe(0);
    });
  });

  describe('isOnline', () => {
    it('returns navigator.onLine value', () => {
      expect(typeof isOnline()).toBe('boolean');
    });
  });
});
