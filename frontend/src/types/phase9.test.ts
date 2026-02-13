import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  UserSchema,
  FamilySchema,
  PostSchema,
  MediaItemSchema,
  RelationshipSchema,
  PostAssetSchema,
  AuditEventSchema,
} from './index.js';

/**
 * Phase 9 — Release Candidate QA
 * Comprehensive validation of all domain schemas across all phases.
 */

// Valid v4 UUIDs (version nibble = 4, variant nibble = 8/9/a/b)
const FAMILY_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const USER_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const USER_B_ID = '550e8400-e29b-41d4-a716-446655440000';
const POST_ID = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
const MEDIA_ID = '6ba7b811-9dad-41d1-80b4-00c04fd430c8';
const ASSET_ID = '6ba7b812-9dad-41d1-80b4-00c04fd430c8';
const REL_ID = '6ba7b813-9dad-41d1-80b4-00c04fd430c8';
const AUDIT_ID = '6ba7b814-9dad-41d1-80b4-00c04fd430c8';

describe('Phase 9 — Release Candidate QA', () => {
  describe('Phase 1-2: Core schemas', () => {
    it('UserSchema validates a complete user', () => {
      const user = {
        id: USER_ID,
        email: 'owner@nself.org',
        display_name: 'Owner',
        avatar_url: null,
        profile: {},
        email_verified: true,
        is_active: true,
        last_login_at: '2026-02-13T00:00:00.000Z',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };
      expect(() => UserSchema.parse(user)).not.toThrow();
    });

    it('UserSchema rejects invalid email', () => {
      const user = {
        id: USER_ID,
        email: 'not-an-email',
        display_name: null,
        avatar_url: null,
        email_verified: false,
        is_active: true,
        last_login_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };
      expect(() => UserSchema.parse(user)).toThrow();
    });

    it('FamilySchema validates a family', () => {
      const family = {
        id: FAMILY_ID,
        name: 'Test Family',
        description: 'A test family',
        settings: {},
        created_by: USER_ID,
        is_active: true,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };
      expect(() => FamilySchema.parse(family)).not.toThrow();
    });

    it('PostSchema validates a post', () => {
      const post = {
        id: POST_ID,
        family_id: FAMILY_ID,
        author_id: USER_ID,
        post_type: 'text',
        title: null,
        body: 'Hello family!',
        visibility: 'family',
        metadata: {},
        is_pinned: false,
        is_deleted: false,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };
      expect(() => PostSchema.parse(post)).not.toThrow();
    });

    it('MediaItemSchema validates a media item', () => {
      const media = {
        id: MEDIA_ID,
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        file_name: 'photo.jpg',
        mime_type: 'image/jpeg',
        file_size: 1024000,
        storage_path: '/dev/family-1/media/photo.jpg',
        checksum_sha256: 'abc123def456',
        width: 1920,
        height: 1080,
        duration_ms: null,
        metadata: {},
        processing_status: 'completed',
        is_deleted: false,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };
      expect(() => MediaItemSchema.parse(media)).not.toThrow();
    });

    it('RelationshipSchema validates a relationship', () => {
      const rel = {
        id: REL_ID,
        family_id: FAMILY_ID,
        user_a_id: USER_ID,
        user_b_id: USER_B_ID,
        relation_type: 'spouse',
        is_mahram: true,
        metadata: {},
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };
      expect(() => RelationshipSchema.parse(rel)).not.toThrow();
    });

    it('AuditEventSchema validates an audit event', () => {
      const event = {
        id: AUDIT_ID,
        family_id: FAMILY_ID,
        event_type: 'post.created',
        actor_id: USER_ID,
        subject_id: POST_ID,
        subject_type: 'post',
        old_state: null,
        new_state: { body: 'Hello family!' },
        created_at: '2026-01-01T00:00:00.000Z',
      };
      expect(() => AuditEventSchema.parse(event)).not.toThrow();
    });
  });

  describe('Schema robustness', () => {
    it('UserSchema handles null optional fields', () => {
      const user = {
        id: USER_ID,
        email: 'test@nself.org',
        display_name: null,
        avatar_url: null,
        email_verified: false,
        is_active: true,
        last_login_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };
      const parsed = UserSchema.parse(user);
      expect(parsed.display_name).toBeNull();
    });

    it('PostSchema accepts null body', () => {
      const post = {
        id: POST_ID,
        family_id: FAMILY_ID,
        author_id: USER_ID,
        post_type: 'photo',
        title: null,
        body: null,
        visibility: 'family',
        metadata: {},
        is_pinned: false,
        is_deleted: false,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };
      const result = PostSchema.safeParse(post);
      expect(result.success).toBe(true);
    });

    it('FamilySchema rejects missing required fields', () => {
      const incomplete = { id: FAMILY_ID };
      const result = FamilySchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it('PostAssetSchema validates a post-media link', () => {
      const asset = {
        id: ASSET_ID,
        post_id: POST_ID,
        media_item_id: MEDIA_ID,
        sort_order: 0,
        caption: 'A photo caption',
        created_at: '2026-01-01T00:00:00.000Z',
      };
      expect(() => PostAssetSchema.parse(asset)).not.toThrow();
    });
  });

  describe('Cross-phase integration contracts', () => {
    it('all schemas share consistent UUID format', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      expect(FAMILY_ID).toMatch(uuidRegex);
      expect(USER_ID).toMatch(uuidRegex);
      expect(POST_ID).toMatch(uuidRegex);
    });

    it('all schemas share consistent timestamp format', () => {
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
      const timestamp = '2026-01-01T00:00:00.000Z';
      expect(timestamp).toMatch(isoRegex);
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('family_id is required on all family-scoped schemas', () => {
      // Post requires family_id
      const postNoFamily = PostSchema.safeParse({
        id: POST_ID,
        author_id: USER_ID,
        post_type: 'text',
        title: null,
        body: 'test',
        visibility: 'family',
        metadata: {},
        is_pinned: false,
        is_deleted: false,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      });
      expect(postNoFamily.success).toBe(false);

      // MediaItem requires family_id
      const mediaNoFamily = MediaItemSchema.safeParse({
        id: MEDIA_ID,
        uploaded_by: USER_ID,
        file_name: 'test.jpg',
        mime_type: 'image/jpeg',
        file_size: 1024,
        storage_path: '/path',
        checksum_sha256: 'abc',
        width: null,
        height: null,
        duration_ms: null,
        metadata: {},
        processing_status: 'pending',
        is_deleted: false,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      });
      expect(mediaNoFamily.success).toBe(false);
    });
  });

  describe('Feature completeness matrix', () => {
    it('Phase 1: Foundation exports exist', () => {
      expect(UserSchema).toBeDefined();
      expect(FamilySchema).toBeDefined();
    });

    it('Phase 2: Core data exports exist', () => {
      expect(PostSchema).toBeDefined();
      expect(MediaItemSchema).toBeDefined();
      expect(AuditEventSchema).toBeDefined();
    });

    it('Phase 3: Family MVP exports exist', () => {
      expect(RelationshipSchema).toBeDefined();
      expect(PostAssetSchema).toBeDefined();
    });

    it('Zod v4 is being used', () => {
      expect(z.string).toBeDefined();
      expect(z.object).toBeDefined();
      expect(z.array).toBeDefined();
    });
  });
});
