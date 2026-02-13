import { describe, it, expect } from 'vitest';
import {
  UserSchema, FamilySchema, PostSchema, MediaItemSchema, RelationshipSchema,
  FamilyMemberSchema, PostAssetSchema, AuditEventSchema,
  parsePost, parseFamily, parseUser,
  FAMILY_ROLES, LIFECYCLE_STATES, POST_TYPES, VISIBILITY_LEVELS, RELATIONSHIP_TYPES,
} from './index';

describe('types', () => {
  describe('enums', () => {
    it('defines family roles', () => {
      expect(FAMILY_ROLES).toContain('OWNER');
      expect(FAMILY_ROLES).toContain('ADMIN');
      expect(FAMILY_ROLES).toContain('ADULT_MEMBER');
      expect(FAMILY_ROLES.length).toBe(6);
    });

    it('defines lifecycle states', () => {
      expect(LIFECYCLE_STATES).toContain('active');
      expect(LIFECYCLE_STATES).toContain('pending_invite');
    });

    it('defines post types', () => {
      expect(POST_TYPES).toContain('text');
      expect(POST_TYPES).toContain('photo');
      expect(POST_TYPES).toContain('milestone');
    });

    it('defines visibility levels', () => {
      expect(VISIBILITY_LEVELS).toContain('family');
      expect(VISIBILITY_LEVELS).toContain('adults_only');
      expect(VISIBILITY_LEVELS).toContain('private');
    });

    it('defines relationship types', () => {
      expect(RELATIONSHIP_TYPES).toContain('spouse');
      expect(RELATIONSHIP_TYPES).toContain('parent');
      expect(RELATIONSHIP_TYPES).toContain('sibling');
    });
  });

  describe('UserSchema', () => {
    it('validates a correct user', () => {
      const user = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        display_name: 'Test User',
        avatar_url: null,
        profile: {},
        email_verified: true,
        is_active: true,
        last_login_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(() => UserSchema.parse(user)).not.toThrow();
    });

    it('rejects invalid email', () => {
      const user = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'not-email',
        display_name: null,
        avatar_url: null,
        profile: {},
        email_verified: false,
        is_active: true,
        last_login_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(() => UserSchema.parse(user)).toThrow();
    });
  });

  describe('FamilySchema', () => {
    it('validates a correct family', () => {
      const family = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Family',
        description: null,
        settings: {},
        created_by: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(() => FamilySchema.parse(family)).not.toThrow();
    });

    it('rejects empty name', () => {
      const family = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: '',
        description: null,
        settings: {},
        created_by: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(() => FamilySchema.parse(family)).toThrow();
    });
  });

  describe('PostSchema', () => {
    it('validates a correct post', () => {
      const post = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        family_id: '550e8400-e29b-41d4-a716-446655440001',
        author_id: '550e8400-e29b-41d4-a716-446655440002',
        post_type: 'text',
        title: 'Test post',
        body: 'Hello world',
        visibility: 'family',
        metadata: {},
        is_pinned: false,
        is_deleted: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(() => PostSchema.parse(post)).not.toThrow();
    });

    it('rejects invalid post type', () => {
      const post = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        family_id: '550e8400-e29b-41d4-a716-446655440001',
        author_id: '550e8400-e29b-41d4-a716-446655440002',
        post_type: 'invalid_type',
        title: null,
        body: null,
        visibility: 'family',
        metadata: {},
        is_pinned: false,
        is_deleted: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(() => PostSchema.parse(post)).toThrow();
    });
  });

  describe('parse helpers', () => {
    it('parsePost validates data', () => {
      const post = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        family_id: '550e8400-e29b-41d4-a716-446655440001',
        author_id: '550e8400-e29b-41d4-a716-446655440002',
        post_type: 'text',
        title: null,
        body: 'test',
        visibility: 'family',
        metadata: {},
        is_pinned: false,
        is_deleted: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(parsePost(post).body).toBe('test');
    });

    it('parseFamily validates data', () => {
      const family = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'My Family',
        description: null,
        settings: {},
        created_by: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(parseFamily(family).name).toBe('My Family');
    });

    it('parseUser validates data', () => {
      const user = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@test.com',
        display_name: 'Test',
        avatar_url: null,
        profile: {},
        email_verified: true,
        is_active: true,
        last_login_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(parseUser(user).email).toBe('test@test.com');
    });
  });
});
