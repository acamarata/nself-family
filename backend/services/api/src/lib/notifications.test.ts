import { describe, it, expect, vi } from 'vitest';
import {
  createNotification, getNotifications, markNotificationsRead,
  getUnreadNotificationCount, shouldSendNotification,
  updateNotificationPreference, registerPushToken,
  setConversationNotificationLevel,
} from './notifications';

function mockPool(rows: unknown[] = [], overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows, ...overrides }),
  } as any;
}

describe('notifications', () => {
  describe('createNotification', () => {
    it('creates a notification', async () => {
      const pool = mockPool([{ id: 'notif-1' }]);
      const result = await createNotification(pool, {
        user_id: 'user-1',
        type: 'chat_message',
        title: 'New message',
        body: 'You have a new message',
      });
      expect(result).toBe('notif-1');
    });

    it('deduplicates by source within 5 minutes', async () => {
      const pool = mockPool([{ id: 'existing' }]);
      const result = await createNotification(pool, {
        user_id: 'user-1',
        type: 'chat_message',
        title: 'New message',
        source_id: 'msg-1',
        source_type: 'message',
      });
      expect(result).toBeNull();
      // Should only check for existing, not insert
      expect(pool.query).toHaveBeenCalledOnce();
    });

    it('creates notification when no duplicate found', async () => {
      const pool = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [] }) // dedup check returns empty
          .mockResolvedValueOnce({ rows: [{ id: 'notif-2' }] }), // insert
      } as any;
      const result = await createNotification(pool, {
        user_id: 'user-1',
        type: 'mention',
        title: 'You were mentioned',
        source_id: 'msg-2',
        source_type: 'message',
      });
      expect(result).toBe('notif-2');
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('skips dedup when no source_id', async () => {
      const pool = mockPool([{ id: 'notif-3' }]);
      await createNotification(pool, {
        user_id: 'user-1',
        type: 'event_reminder',
        title: 'Event starting soon',
      });
      // Should only insert (no dedup check)
      expect(pool.query).toHaveBeenCalledOnce();
    });
  });

  describe('getNotifications', () => {
    it('returns notifications for user', async () => {
      const pool = mockPool([
        { id: 'n1', type: 'chat', title: 'Msg', body: null, data: {}, status: 'pending', created_at: '2025-01-01' },
        { id: 'n2', type: 'mention', title: 'Mentioned', body: 'By Bob', data: {}, status: 'read', created_at: '2025-01-02' },
      ]);
      const result = await getNotifications(pool, 'user-1');
      expect(result).toHaveLength(2);
    });

    it('respects limit parameter', async () => {
      const pool = mockPool([]);
      await getNotifications(pool, 'user-1', 10);
      const params = pool.query.mock.calls[0][1];
      expect(params[1]).toBe(10);
    });
  });

  describe('markNotificationsRead', () => {
    it('marks notifications as read', async () => {
      const pool = mockPool([], { rowCount: 3 });
      const result = await markNotificationsRead(pool, 'user-1', ['n1', 'n2', 'n3']);
      expect(result).toBe(3);
    });

    it('returns 0 for empty array', async () => {
      const pool = mockPool();
      const result = await markNotificationsRead(pool, 'user-1', []);
      expect(result).toBe(0);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('returns unread count', async () => {
      const pool = mockPool([{ count: '7' }]);
      const result = await getUnreadNotificationCount(pool, 'user-1');
      expect(result).toBe(7);
    });
  });

  describe('shouldSendNotification', () => {
    it('returns true when no preference set', async () => {
      const pool = mockPool([]);
      const result = await shouldSendNotification(pool, 'user-1', 'chat_message', 'push');
      expect(result).toBe(true);
    });

    it('returns false when disabled', async () => {
      const pool = mockPool([{ enabled: false, quiet_hours_start: null, quiet_hours_end: null }]);
      const result = await shouldSendNotification(pool, 'user-1', 'chat_message', 'push');
      expect(result).toBe(false);
    });

    it('returns true when enabled and no quiet hours', async () => {
      const pool = mockPool([{ enabled: true, quiet_hours_start: null, quiet_hours_end: null }]);
      const result = await shouldSendNotification(pool, 'user-1', 'chat_message', 'push');
      expect(result).toBe(true);
    });
  });

  describe('updateNotificationPreference', () => {
    it('upserts preference', async () => {
      const pool = mockPool();
      await updateNotificationPreference(pool, 'user-1', 'chat_message', 'push', true, '22:00', '07:00');
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('ON CONFLICT');
      expect(params).toEqual(['user-1', 'chat_message', 'push', true, '22:00', '07:00']);
    });
  });

  describe('registerPushToken', () => {
    it('registers a push token', async () => {
      const pool = mockPool([{ id: 'token-1' }]);
      const result = await registerPushToken(pool, 'user-1', 'fcm-token-abc', 'fcm', 'iPhone');
      expect(result).toBe('token-1');
    });

    it('handles missing device name', async () => {
      const pool = mockPool([{ id: 'token-2' }]);
      await registerPushToken(pool, 'user-1', 'apns-token-xyz', 'apns');
      const params = pool.query.mock.calls[0][1];
      expect(params[3]).toBeNull();
    });
  });

  describe('setConversationNotificationLevel', () => {
    it('upserts notification level', async () => {
      const pool = mockPool();
      await setConversationNotificationLevel(pool, 'conv-1', 'user-1', 'muted');
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('ON CONFLICT');
      expect(params).toEqual(['conv-1', 'user-1', 'muted']);
    });
  });
});
