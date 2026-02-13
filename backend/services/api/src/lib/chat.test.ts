import { describe, it, expect, vi } from 'vitest';
import {
  createConversation, sendMessage, editMessage, deleteMessage,
  addReaction, removeReaction, updateReadState, getUnreadCount,
  searchMessages, adminDeleteMessage,
} from './chat';

function mockClient(rows: unknown[] = [], overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows, ...overrides }),
    release: vi.fn(),
  };
}

function mockPool(rows: unknown[] = [], overrides: Record<string, unknown> = {}) {
  const client = mockClient(rows, overrides);
  return {
    pool: {
      query: vi.fn().mockResolvedValue({ rows, ...overrides }),
      connect: vi.fn().mockResolvedValue(client),
    } as any,
    client,
  };
}

describe('chat', () => {
  describe('createConversation', () => {
    it('creates conversation with members in transaction', async () => {
      const client = mockClient([{ id: 'conv-1' }]);
      const pool = { connect: vi.fn().mockResolvedValue(client) } as any;

      const result = await createConversation(pool, {
        family_id: 'fam-1',
        type: 'group',
        title: 'Family Chat',
        created_by: 'user-1',
        member_ids: ['user-1', 'user-2', 'user-3'],
      });

      expect(result).toBe('conv-1');
      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();
      // 1 BEGIN + 1 INSERT conversation + 1 creator member + 2 other members + 1 COMMIT = 6 calls
      expect(client.query).toHaveBeenCalledTimes(6);
    });

    it('creates direct conversation without title', async () => {
      const client = mockClient([{ id: 'conv-2' }]);
      const pool = { connect: vi.fn().mockResolvedValue(client) } as any;

      await createConversation(pool, {
        family_id: 'fam-1',
        type: 'direct',
        created_by: 'user-1',
        member_ids: ['user-1', 'user-2'],
      });

      const insertCall = client.query.mock.calls[1];
      expect(insertCall[1][2]).toBeNull(); // title is null for direct
    });

    it('rolls back on error', async () => {
      const client = mockClient();
      client.query.mockRejectedValueOnce(new Error('BEGIN')); // BEGIN succeeds
      client.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Insert failed')); // Conversation insert fails
      const pool = { connect: vi.fn().mockResolvedValue(client) } as any;

      await expect(createConversation(pool, {
        family_id: 'fam-1', type: 'direct', created_by: 'user-1', member_ids: [],
      })).rejects.toThrow();
      expect(client.release).toHaveBeenCalled();
    });

    it('does not duplicate creator in member list', async () => {
      const client = mockClient([{ id: 'conv-3' }]);
      const pool = { connect: vi.fn().mockResolvedValue(client) } as any;

      await createConversation(pool, {
        family_id: 'fam-1', type: 'group', title: 'Test',
        created_by: 'user-1', member_ids: ['user-1'],
      });

      // BEGIN + INSERT conv + 1 creator member (admin) + COMMIT = 4 calls
      expect(client.query).toHaveBeenCalledTimes(4);
    });
  });

  describe('sendMessage', () => {
    it('inserts a text message', async () => {
      const { pool } = mockPool([{ id: 'msg-1', created_at: '2025-01-01T00:00:00Z' }]);
      const result = await sendMessage(pool, {
        conversation_id: 'conv-1',
        sender_id: 'user-1',
        content: 'Hello world',
      });
      expect(result).toBe('msg-1');
      expect(pool.query).toHaveBeenCalledOnce();
      const params = pool.query.mock.calls[0][1];
      expect(params[2]).toBe('Hello world');
      expect(params[3]).toBe('text'); // default type
    });

    it('inserts message with mentions', async () => {
      const { pool } = mockPool([{ id: 'msg-2', created_at: '2025-01-01T00:00:00Z' }]);
      await sendMessage(pool, {
        conversation_id: 'conv-1',
        sender_id: 'user-1',
        content: 'Hey @user-2 @user-3',
        mentions: ['user-2', 'user-3'],
      });
      // 1 message insert + 2 mention inserts
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    it('inserts message with reply and media', async () => {
      const { pool } = mockPool([{ id: 'msg-3', created_at: '2025-01-01T00:00:00Z' }]);
      await sendMessage(pool, {
        conversation_id: 'conv-1',
        sender_id: 'user-1',
        content: 'See this photo',
        message_type: 'image',
        reply_to_id: 'msg-original',
        media_id: 'media-1',
      });
      const params = pool.query.mock.calls[0][1];
      expect(params[3]).toBe('image');
      expect(params[4]).toBe('msg-original');
      expect(params[5]).toBe('media-1');
    });

    it('inserts shared content message', async () => {
      const { pool } = mockPool([{ id: 'msg-4', created_at: '2025-01-01T00:00:00Z' }]);
      await sendMessage(pool, {
        conversation_id: 'conv-1',
        sender_id: 'user-1',
        content: 'Check out this recipe',
        message_type: 'shared_link',
        shared_content: { type: 'recipe', id: 'recipe-1', title: 'Pasta' },
      });
      const params = pool.query.mock.calls[0][1];
      expect(params[6]).toBe(JSON.stringify({ type: 'recipe', id: 'recipe-1', title: 'Pasta' }));
    });
  });

  describe('editMessage', () => {
    it('edits message content', async () => {
      const { pool } = mockPool([], { rowCount: 1 });
      const result = await editMessage(pool, 'msg-1', 'user-1', 'Updated content');
      expect(result).toBe(true);
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('UPDATE public.messages');
      expect(params[0]).toBe('Updated content');
      expect(params[1]).toBe('msg-1');
      expect(params[2]).toBe('user-1');
    });

    it('returns false when message not found or wrong sender', async () => {
      const { pool } = mockPool([], { rowCount: 0 });
      const result = await editMessage(pool, 'msg-1', 'wrong-user', 'New content');
      expect(result).toBe(false);
    });
  });

  describe('deleteMessage', () => {
    it('soft-deletes message', async () => {
      const { pool } = mockPool([], { rowCount: 1 });
      const result = await deleteMessage(pool, 'msg-1', 'user-1');
      expect(result).toBe(true);
      const sql = pool.query.mock.calls[0][0];
      expect(sql).toContain('deleted_at = now()');
      expect(sql).toContain('content = NULL');
    });

    it('returns false for already deleted message', async () => {
      const { pool } = mockPool([], { rowCount: 0 });
      const result = await deleteMessage(pool, 'msg-1', 'user-1');
      expect(result).toBe(false);
    });
  });

  describe('addReaction', () => {
    it('adds reaction and returns ID', async () => {
      const { pool } = mockPool([{ id: 'reaction-1' }]);
      const result = await addReaction(pool, 'msg-1', 'user-1', '👍');
      expect(result).toBe('reaction-1');
    });

    it('returns empty string for duplicate reaction', async () => {
      const { pool } = mockPool([]);
      const result = await addReaction(pool, 'msg-1', 'user-1', '👍');
      expect(result).toBe('');
    });
  });

  describe('removeReaction', () => {
    it('removes reaction', async () => {
      const { pool } = mockPool([], { rowCount: 1 });
      const result = await removeReaction(pool, 'msg-1', 'user-1', '👍');
      expect(result).toBe(true);
    });

    it('returns false when reaction not found', async () => {
      const { pool } = mockPool([], { rowCount: 0 });
      const result = await removeReaction(pool, 'msg-1', 'user-1', '🎉');
      expect(result).toBe(false);
    });
  });

  describe('updateReadState', () => {
    it('upserts read state', async () => {
      const { pool } = mockPool();
      await updateReadState(pool, 'conv-1', 'user-1', 'msg-5');
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO public.read_states');
      expect(sql).toContain('ON CONFLICT');
      expect(params).toEqual(['conv-1', 'user-1', 'msg-5']);
    });
  });

  describe('getUnreadCount', () => {
    it('returns unread message count', async () => {
      const { pool } = mockPool([{ count: '3' }]);
      const result = await getUnreadCount(pool, 'conv-1', 'user-1');
      expect(result).toBe(3);
    });

    it('returns 0 when all read', async () => {
      const { pool } = mockPool([{ count: '0' }]);
      const result = await getUnreadCount(pool, 'conv-1', 'user-1');
      expect(result).toBe(0);
    });
  });

  describe('searchMessages', () => {
    it('searches across all user conversations', async () => {
      const { pool } = mockPool([
        { id: 'msg-1', conversation_id: 'conv-1', content: 'Hello world', sender_id: 'user-2', created_at: '2025-01-01T00:00:00Z' },
      ]);
      const result = await searchMessages(pool, 'user-1', 'hello');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Hello world');
      const sql = pool.query.mock.calls[0][0];
      expect(sql).toContain('ILIKE');
      expect(sql).toContain('conversation_members');
    });

    it('filters by conversation when specified', async () => {
      const { pool } = mockPool([]);
      await searchMessages(pool, 'user-1', 'test', 'conv-1');
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('conversation_id = $3');
      expect(params[2]).toBe('conv-1');
    });
  });

  describe('adminDeleteMessage', () => {
    it('deletes message and records admin', async () => {
      const { pool } = mockPool([], { rowCount: 1 });
      const result = await adminDeleteMessage(pool, 'msg-1', 'admin-1');
      expect(result).toBe(true);
      const sql = pool.query.mock.calls[0][0];
      expect(sql).toContain('deleted_by');
    });
  });
});
