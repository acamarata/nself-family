import { describe, it, expect } from 'vitest';
import {
  ConversationSchema, ConversationMemberSchema, MessageSchema,
  MessageReactionSchema, ReadStateSchema, NotificationEventSchema,
  CONVERSATION_TYPES, MESSAGE_TYPES, CONVERSATION_MEMBER_ROLES,
  NOTIFICATION_CHANNELS, NOTIFICATION_LEVELS, DELIVERY_STATES,
} from './index';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = '550e8400-e29b-41d4-a716-446655440001';

describe('Phase 6 types', () => {
  describe('enums', () => {
    it('defines conversation types', () => {
      expect(CONVERSATION_TYPES).toContain('direct');
      expect(CONVERSATION_TYPES).toContain('group');
      expect(CONVERSATION_TYPES.length).toBe(2);
    });

    it('defines message types', () => {
      expect(MESSAGE_TYPES).toContain('text');
      expect(MESSAGE_TYPES).toContain('image');
      expect(MESSAGE_TYPES).toContain('shared_link');
      expect(MESSAGE_TYPES.length).toBe(6);
    });

    it('defines conversation member roles', () => {
      expect(CONVERSATION_MEMBER_ROLES).toContain('admin');
      expect(CONVERSATION_MEMBER_ROLES).toContain('member');
      expect(CONVERSATION_MEMBER_ROLES.length).toBe(2);
    });

    it('defines notification channels', () => {
      expect(NOTIFICATION_CHANNELS).toContain('in_app');
      expect(NOTIFICATION_CHANNELS).toContain('push');
      expect(NOTIFICATION_CHANNELS).toContain('email');
      expect(NOTIFICATION_CHANNELS.length).toBe(3);
    });

    it('defines notification levels', () => {
      expect(NOTIFICATION_LEVELS).toContain('all');
      expect(NOTIFICATION_LEVELS).toContain('mentions_only');
      expect(NOTIFICATION_LEVELS).toContain('muted');
      expect(NOTIFICATION_LEVELS.length).toBe(3);
    });

    it('defines delivery states', () => {
      expect(DELIVERY_STATES).toContain('sending');
      expect(DELIVERY_STATES).toContain('sent');
      expect(DELIVERY_STATES).toContain('delivered');
      expect(DELIVERY_STATES).toContain('read');
      expect(DELIVERY_STATES.length).toBe(4);
    });
  });

  describe('ConversationSchema', () => {
    it('validates a group conversation', () => {
      const conv = {
        id: UUID, family_id: UUID2, type: 'group', title: 'Family Chat',
        avatar_url: null, created_by: UUID, is_archived: false,
        metadata: {}, last_message_at: '2025-06-15T14:00:00Z',
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => ConversationSchema.parse(conv)).not.toThrow();
    });

    it('validates a direct conversation', () => {
      const conv = {
        id: UUID, family_id: UUID2, type: 'direct', title: null,
        avatar_url: null, created_by: UUID, is_archived: false,
        metadata: {}, last_message_at: null,
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => ConversationSchema.parse(conv)).not.toThrow();
    });

    it('rejects invalid type', () => {
      const conv = {
        id: UUID, family_id: UUID2, type: 'channel', title: null,
        avatar_url: null, created_by: UUID, is_archived: false,
        metadata: {}, last_message_at: null,
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => ConversationSchema.parse(conv)).toThrow();
    });
  });

  describe('MessageSchema', () => {
    it('validates a text message', () => {
      const msg = {
        id: UUID, conversation_id: UUID2, sender_id: UUID,
        content: 'Hello world', message_type: 'text',
        reply_to_id: null, media_id: null, shared_content: null,
        edited_at: null, deleted_at: null, metadata: {},
        created_at: '2025-06-15T14:00:00Z',
      };
      expect(() => MessageSchema.parse(msg)).not.toThrow();
    });

    it('validates a deleted message', () => {
      const msg = {
        id: UUID, conversation_id: UUID2, sender_id: UUID,
        content: null, message_type: 'text',
        reply_to_id: null, media_id: null, shared_content: null,
        edited_at: null, deleted_at: '2025-06-15T15:00:00Z', metadata: {},
        created_at: '2025-06-15T14:00:00Z',
      };
      const parsed = MessageSchema.parse(msg);
      expect(parsed.deleted_at).toBeTruthy();
      expect(parsed.content).toBeNull();
    });

    it('validates a shared_link message', () => {
      const msg = {
        id: UUID, conversation_id: UUID2, sender_id: UUID,
        content: 'Check this out', message_type: 'shared_link',
        reply_to_id: null, media_id: null,
        shared_content: { type: 'recipe', id: 'recipe-1', title: 'Pasta' },
        edited_at: null, deleted_at: null, metadata: {},
        created_at: '2025-06-15T14:00:00Z',
      };
      expect(() => MessageSchema.parse(msg)).not.toThrow();
    });

    it('validates a reply message', () => {
      const msg = {
        id: UUID, conversation_id: UUID2, sender_id: UUID,
        content: 'I agree', message_type: 'text',
        reply_to_id: UUID2, media_id: null, shared_content: null,
        edited_at: null, deleted_at: null, metadata: {},
        created_at: '2025-06-15T14:00:00Z',
      };
      const parsed = MessageSchema.parse(msg);
      expect(parsed.reply_to_id).toBe(UUID2);
    });

    it('validates an edited message', () => {
      const msg = {
        id: UUID, conversation_id: UUID2, sender_id: UUID,
        content: 'Updated content', message_type: 'text',
        reply_to_id: null, media_id: null, shared_content: null,
        edited_at: '2025-06-15T14:30:00Z', deleted_at: null, metadata: {},
        created_at: '2025-06-15T14:00:00Z',
      };
      const parsed = MessageSchema.parse(msg);
      expect(parsed.edited_at).toBeTruthy();
    });
  });

  describe('MessageReactionSchema', () => {
    it('validates a reaction', () => {
      const reaction = {
        id: UUID, message_id: UUID2, user_id: UUID,
        emoji: '👍', created_at: '2025-06-15T14:00:00Z',
      };
      expect(() => MessageReactionSchema.parse(reaction)).not.toThrow();
    });
  });

  describe('ReadStateSchema', () => {
    it('validates a read state', () => {
      const state = {
        id: UUID, conversation_id: UUID2, user_id: UUID,
        last_read_message_id: UUID2, last_read_at: '2025-06-15T14:00:00Z',
      };
      expect(() => ReadStateSchema.parse(state)).not.toThrow();
    });

    it('allows null last_read_message_id', () => {
      const state = {
        id: UUID, conversation_id: UUID2, user_id: UUID,
        last_read_message_id: null, last_read_at: '2025-06-15T14:00:00Z',
      };
      const parsed = ReadStateSchema.parse(state);
      expect(parsed.last_read_message_id).toBeNull();
    });
  });

  describe('NotificationEventSchema', () => {
    it('validates a notification event', () => {
      const event = {
        id: UUID, family_id: UUID2, user_id: UUID,
        type: 'chat_message', title: 'New message',
        body: 'You have a new message', data: {},
        channel: 'in_app', status: 'pending',
        source_id: UUID2, source_type: 'message',
        created_at: '2025-06-15T14:00:00Z',
      };
      expect(() => NotificationEventSchema.parse(event)).not.toThrow();
    });

    it('allows nullable fields', () => {
      const event = {
        id: UUID, family_id: null, user_id: UUID,
        type: 'event_reminder', title: 'Event starting',
        body: null, data: {}, channel: 'push', status: 'sent',
        source_id: null, source_type: null,
        created_at: '2025-06-15T14:00:00Z',
      };
      const parsed = NotificationEventSchema.parse(event);
      expect(parsed.family_id).toBeNull();
      expect(parsed.body).toBeNull();
    });
  });
});
