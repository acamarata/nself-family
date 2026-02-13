import { describe, it, expect } from 'vitest';
import {
  LegacyVaultSchema, VaultItemSchema, VaultRecipientSchema,
  InheritanceScenarioSchema, DigitalSuccessorSchema, MemorialProfileSchema,
  SearchResultSchema, ActivityLogSchema,
  VAULT_STATUSES, RELEASE_CONDITIONS, AFTER_DEATH_ACTIONS,
  MEMORIAL_STATES, VAULT_CONTENT_TYPES, SEARCH_CONTENT_TYPES,
} from './index';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = '550e8400-e29b-41d4-a716-446655440001';

describe('Phase 7 types', () => {
  describe('enums', () => {
    it('defines vault statuses', () => {
      expect(VAULT_STATUSES).toContain('active');
      expect(VAULT_STATUSES).toContain('sealed');
      expect(VAULT_STATUSES).toContain('released');
      expect(VAULT_STATUSES.length).toBe(3);
    });

    it('defines release conditions', () => {
      expect(RELEASE_CONDITIONS).toContain('manual');
      expect(RELEASE_CONDITIONS).toContain('time_trigger');
      expect(RELEASE_CONDITIONS).toContain('death_verification');
      expect(RELEASE_CONDITIONS.length).toBe(3);
    });

    it('defines after-death actions', () => {
      expect(AFTER_DEATH_ACTIONS).toContain('memorialize');
      expect(AFTER_DEATH_ACTIONS).toContain('delete');
      expect(AFTER_DEATH_ACTIONS).toContain('transfer');
      expect(AFTER_DEATH_ACTIONS.length).toBe(3);
    });

    it('defines memorial states', () => {
      expect(MEMORIAL_STATES).toContain('active');
      expect(MEMORIAL_STATES).toContain('pending_memorial');
      expect(MEMORIAL_STATES).toContain('memorialized');
      expect(MEMORIAL_STATES.length).toBe(3);
    });

    it('defines vault content types', () => {
      expect(VAULT_CONTENT_TYPES).toContain('letter');
      expect(VAULT_CONTENT_TYPES).toContain('document');
      expect(VAULT_CONTENT_TYPES).toContain('media');
      expect(VAULT_CONTENT_TYPES).toContain('message');
      expect(VAULT_CONTENT_TYPES.length).toBe(4);
    });

    it('defines search content types', () => {
      expect(SEARCH_CONTENT_TYPES).toContain('post');
      expect(SEARCH_CONTENT_TYPES).toContain('recipe');
      expect(SEARCH_CONTENT_TYPES).toContain('event');
      expect(SEARCH_CONTENT_TYPES).toContain('message');
      expect(SEARCH_CONTENT_TYPES.length).toBe(7);
    });
  });

  describe('LegacyVaultSchema', () => {
    it('validates a correct vault', () => {
      const vault = {
        id: UUID, family_id: UUID2, owner_id: UUID, title: 'My Legacy',
        description: 'For my children', status: 'active', sealed_at: null,
        released_at: null, release_condition: 'manual', release_trigger_at: null,
        requires_reauth: true, metadata: {},
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => LegacyVaultSchema.parse(vault)).not.toThrow();
    });

    it('rejects vault without title', () => {
      const vault = {
        id: UUID, family_id: UUID2, owner_id: UUID, title: '',
        description: null, status: 'active', sealed_at: null,
        released_at: null, release_condition: 'manual', release_trigger_at: null,
        requires_reauth: true, metadata: {},
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => LegacyVaultSchema.parse(vault)).toThrow();
    });

    it('validates sealed vault', () => {
      const vault = {
        id: UUID, family_id: UUID2, owner_id: UUID, title: 'Sealed',
        description: null, status: 'sealed', sealed_at: '2025-06-01T00:00:00Z',
        released_at: null, release_condition: 'death_verification', release_trigger_at: null,
        requires_reauth: true, metadata: {},
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      const parsed = LegacyVaultSchema.parse(vault);
      expect(parsed.status).toBe('sealed');
      expect(parsed.sealed_at).toBe('2025-06-01T00:00:00Z');
    });

    it('rejects invalid status', () => {
      const vault = {
        id: UUID, family_id: UUID2, owner_id: UUID, title: 'Bad',
        description: null, status: 'invalid', sealed_at: null,
        released_at: null, release_condition: 'manual', release_trigger_at: null,
        requires_reauth: true, metadata: {},
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => LegacyVaultSchema.parse(vault)).toThrow();
    });
  });

  describe('VaultItemSchema', () => {
    it('validates a correct item', () => {
      const item = {
        id: UUID, vault_id: UUID2, content_type: 'letter',
        title: 'Final Letter', content: 'Dear family...',
        media_id: null, sort_order: 1, metadata: {},
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => VaultItemSchema.parse(item)).not.toThrow();
    });
  });

  describe('VaultRecipientSchema', () => {
    it('validates a correct recipient', () => {
      const recipient = {
        id: UUID, vault_id: UUID2, user_id: UUID,
        message: 'With love', notified_at: null, viewed_at: null,
        created_at: '2025-01-01T00:00:00Z',
      };
      expect(() => VaultRecipientSchema.parse(recipient)).not.toThrow();
    });
  });

  describe('InheritanceScenarioSchema', () => {
    it('validates a correct scenario', () => {
      const scenario = {
        id: UUID, family_id: UUID2, owner_id: UUID,
        version: 3, input_snapshot: { vaults: 2 }, output_snapshot: { distribution: 'even' },
        created_at: '2025-01-01T00:00:00Z',
      };
      expect(() => InheritanceScenarioSchema.parse(scenario)).not.toThrow();
    });
  });

  describe('DigitalSuccessorSchema', () => {
    it('validates a correct successor', () => {
      const successor = {
        id: UUID, family_id: UUID2, owner_id: UUID, successor_id: UUID2,
        after_death_action: 'memorialize', notes: null, confirmed_at: null,
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => DigitalSuccessorSchema.parse(successor)).not.toThrow();
    });

    it('rejects invalid after-death action', () => {
      const successor = {
        id: UUID, family_id: UUID2, owner_id: UUID, successor_id: UUID2,
        after_death_action: 'invalid', notes: null, confirmed_at: null,
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => DigitalSuccessorSchema.parse(successor)).toThrow();
    });
  });

  describe('MemorialProfileSchema', () => {
    it('validates active profile', () => {
      const profile = {
        id: UUID, user_id: UUID2, family_id: UUID, state: 'active',
        requested_by: null, approved_by: null, memorial_message: null,
        memorial_date: null, requested_at: null, approved_at: null,
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => MemorialProfileSchema.parse(profile)).not.toThrow();
    });

    it('validates memorialized profile', () => {
      const profile = {
        id: UUID, user_id: UUID2, family_id: UUID, state: 'memorialized',
        requested_by: UUID, approved_by: UUID2, memorial_message: 'In loving memory',
        memorial_date: '2025-06-15', requested_at: '2025-06-01T00:00:00Z',
        approved_at: '2025-06-02T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-06-02T00:00:00Z',
      };
      const parsed = MemorialProfileSchema.parse(profile);
      expect(parsed.state).toBe('memorialized');
      expect(parsed.memorial_message).toBe('In loving memory');
    });

    it('rejects invalid memorial state', () => {
      const profile = {
        id: UUID, user_id: UUID2, family_id: UUID, state: 'invalid',
        requested_by: null, approved_by: null, memorial_message: null,
        memorial_date: null, requested_at: null, approved_at: null,
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => MemorialProfileSchema.parse(profile)).toThrow();
    });
  });

  describe('SearchResultSchema', () => {
    it('validates a search result', () => {
      const result = {
        id: UUID, family_id: UUID2, content_type: 'post', content_id: UUID,
        title: 'BBQ Party', body: 'Great time at the park',
        author_id: UUID, visibility: 'family', metadata: {},
        rank: 0.5, headline: '<mark>BBQ</mark> Party',
        created_at: '2025-01-01T00:00:00Z',
      };
      expect(() => SearchResultSchema.parse(result)).not.toThrow();
    });
  });

  describe('ActivityLogSchema', () => {
    it('validates an activity log entry', () => {
      const entry = {
        id: UUID, family_id: UUID2, actor_id: UUID,
        action: 'created_post', target_type: 'post', target_id: UUID2,
        summary: 'Created a new post', metadata: {},
        created_at: '2025-01-01T00:00:00Z',
      };
      expect(() => ActivityLogSchema.parse(entry)).not.toThrow();
    });
  });
});
