import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const FAMILY_ROLES = ['OWNER', 'ADMIN', 'ADULT_MEMBER', 'YOUTH_MEMBER', 'CHILD_MEMBER', 'DEVICE'] as const;
export type FamilyRole = (typeof FAMILY_ROLES)[number];

export const LIFECYCLE_STATES = ['active', 'inactive', 'suspended', 'pending_invite'] as const;
export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

export const POST_TYPES = ['text', 'photo', 'video', 'album', 'event', 'recipe', 'milestone'] as const;
export type PostType = (typeof POST_TYPES)[number];

export const VISIBILITY_LEVELS = ['family', 'adults_only', 'private', 'public'] as const;
export type VisibilityLevel = (typeof VISIBILITY_LEVELS)[number];

export const RELATIONSHIP_TYPES = [
  'spouse', 'parent', 'child', 'sibling',
  'grandparent', 'grandchild', 'uncle_aunt', 'nephew_niece', 'cousin',
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

// ============================================================================
// Zod schemas (runtime validation)
// ============================================================================

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  profile: z.record(z.unknown()).default({}),
  email_verified: z.boolean(),
  is_active: z.boolean(),
  last_login_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const FamilySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  settings: z.record(z.unknown()).default({}),
  created_by: z.string().uuid().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const FamilyMemberSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(FAMILY_ROLES),
  lifecycle_state: z.enum(LIFECYCLE_STATES),
  display_name: z.string().nullable(),
  permissions: z.record(z.unknown()).default({}),
  joined_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  user: UserSchema.optional(),
});

export const RelationshipSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  user_a_id: z.string().uuid(),
  user_b_id: z.string().uuid(),
  relation_type: z.string(),
  is_mahram: z.boolean(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});

export const MediaItemSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  uploaded_by: z.string().uuid(),
  file_name: z.string(),
  mime_type: z.string(),
  file_size: z.number(),
  storage_path: z.string(),
  checksum_sha256: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  duration_ms: z.number().nullable(),
  metadata: z.record(z.unknown()).default({}),
  processing_status: z.string(),
  is_deleted: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const MediaVariantSchema = z.object({
  id: z.string().uuid(),
  media_item_id: z.string().uuid(),
  variant_type: z.string(),
  storage_path: z.string(),
  mime_type: z.string(),
  file_size: z.number(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  created_at: z.string(),
});

export const PostAssetSchema = z.object({
  id: z.string().uuid(),
  post_id: z.string().uuid(),
  media_item_id: z.string().uuid(),
  sort_order: z.number(),
  caption: z.string().nullable(),
  created_at: z.string(),
  media_item: MediaItemSchema.optional(),
});

export const PostSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  author_id: z.string().uuid(),
  post_type: z.enum(POST_TYPES),
  title: z.string().nullable(),
  body: z.string().nullable(),
  visibility: z.enum(VISIBILITY_LEVELS),
  metadata: z.record(z.unknown()).default({}),
  is_pinned: z.boolean(),
  is_deleted: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  author: UserSchema.pick({ id: true, display_name: true, avatar_url: true }).optional(),
  post_assets: z.array(PostAssetSchema).optional(),
});

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid().nullable(),
  event_type: z.string(),
  actor_id: z.string().uuid().nullable(),
  subject_id: z.string().uuid().nullable(),
  subject_type: z.string().nullable(),
  old_state: z.record(z.unknown()).nullable(),
  new_state: z.record(z.unknown()).nullable(),
  created_at: z.string(),
});

// ============================================================================
// Inferred TypeScript types
// ============================================================================

export type User = z.infer<typeof UserSchema>;
export type Family = z.infer<typeof FamilySchema>;
export type FamilyMember = z.infer<typeof FamilyMemberSchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
export type MediaItem = z.infer<typeof MediaItemSchema>;
export type MediaVariant = z.infer<typeof MediaVariantSchema>;
export type PostAsset = z.infer<typeof PostAssetSchema>;
export type Post = z.infer<typeof PostSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;

// ============================================================================
// Serialization helpers
// ============================================================================

/**
 * Parse and validate a post from an API/GraphQL response.
 * @param data - Raw post data
 * @returns Validated Post object
 */
export function parsePost(data: unknown): Post {
  return PostSchema.parse(data);
}

/**
 * Parse and validate a family from an API/GraphQL response.
 * @param data - Raw family data
 * @returns Validated Family object
 */
export function parseFamily(data: unknown): Family {
  return FamilySchema.parse(data);
}

/**
 * Parse and validate a user from an API/GraphQL response.
 * @param data - Raw user data
 * @returns Validated User object
 */
export function parseUser(data: unknown): User {
  return UserSchema.parse(data);
}
