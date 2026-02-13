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
  profile: z.record(z.string(), z.unknown()).default({}),
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
  settings: z.record(z.string(), z.unknown()).default({}),
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
  permissions: z.record(z.string(), z.unknown()).default({}),
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
  metadata: z.record(z.string(), z.unknown()).default({}),
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
  metadata: z.record(z.string(), z.unknown()).default({}),
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
  metadata: z.record(z.string(), z.unknown()).default({}),
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
  old_state: z.record(z.string(), z.unknown()).nullable(),
  new_state: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
});

// ============================================================================
// Phase 5: Calendar, Trips, Location, Recipes
// ============================================================================

export const RSVP_STATUSES = ['pending', 'accepted', 'declined', 'maybe'] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export const TRIP_STATUSES = ['planning', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const EventSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  start_at: z.string(),
  end_at: z.string().nullable(),
  all_day: z.boolean(),
  location: z.string().nullable(),
  recurrence_rule: z.string().nullable(),
  color: z.string().nullable(),
  created_by: z.string().uuid(),
  is_deleted: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});

export const EventInviteSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: z.enum(RSVP_STATUSES),
  responded_at: z.string().nullable(),
  created_at: z.string(),
  user: UserSchema.pick({ id: true, display_name: true, avatar_url: true }).optional(),
});

export const TripSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  title: z.string().min(1),
  destination: z.string().nullable(),
  description: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  status: z.enum(TRIP_STATUSES),
  event_id: z.string().uuid().nullable(),
  created_by: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});

export const TripItineraryItemSchema = z.object({
  id: z.string().uuid(),
  trip_id: z.string().uuid(),
  day_number: z.number(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  activity: z.string(),
  location: z.string().nullable(),
  notes: z.string().nullable(),
  sort_order: z.number(),
  created_by: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const LocationShareSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  family_id: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().nullable(),
  altitude: z.number().nullable(),
  heading: z.number().nullable(),
  speed: z.number().nullable(),
  expires_at: z.string(),
  created_at: z.string(),
  display_name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
});

export const GeofenceSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  name: z.string(),
  center_lat: z.number(),
  center_lng: z.number(),
  radius_meters: z.number(),
  alert_on_enter: z.boolean(),
  alert_on_exit: z.boolean(),
  monitored_user_ids: z.array(z.string().uuid()),
  created_by: z.string().uuid(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const RecipeSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  prep_time_minutes: z.number().nullable(),
  cook_time_minutes: z.number().nullable(),
  servings: z.number().nullable(),
  difficulty: z.string().nullable(),
  cuisine: z.string().nullable(),
  visibility: z.string().default('family'),
  source_url: z.string().nullable(),
  cover_image_id: z.string().uuid().nullable(),
  created_by: z.string().uuid(),
  is_deleted: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});

export const RecipeIngredientSchema = z.object({
  id: z.string().uuid(),
  recipe_id: z.string().uuid(),
  name: z.string(),
  amount: z.number().nullable(),
  unit: z.string().nullable(),
  sort_order: z.number(),
  notes: z.string().nullable(),
});

export const RecipeStepSchema = z.object({
  id: z.string().uuid(),
  recipe_id: z.string().uuid(),
  step_number: z.number(),
  instruction: z.string(),
  media_id: z.string().uuid().nullable(),
  duration_minutes: z.number().nullable(),
});

export const MealPlanSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  date: z.string(),
  meal_type: z.enum(MEAL_TYPES),
  recipe_id: z.string().uuid().nullable(),
  title: z.string().nullable(),
  notes: z.string().nullable(),
  servings: z.number().nullable(),
  created_by: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
  recipe: RecipeSchema.optional(),
});

// ============================================================================
// Phase 6: Chat, Messages, Notifications
// ============================================================================

export const CONVERSATION_TYPES = ['direct', 'group'] as const;
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

export const MESSAGE_TYPES = ['text', 'image', 'video', 'file', 'system', 'shared_link'] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const CONVERSATION_MEMBER_ROLES = ['admin', 'member'] as const;
export type ConversationMemberRole = (typeof CONVERSATION_MEMBER_ROLES)[number];

export const NOTIFICATION_CHANNELS = ['in_app', 'push', 'email'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_LEVELS = ['all', 'mentions_only', 'muted'] as const;
export type NotificationLevel = (typeof NOTIFICATION_LEVELS)[number];

export const DELIVERY_STATES = ['sending', 'sent', 'delivered', 'read'] as const;
export type DeliveryState = (typeof DELIVERY_STATES)[number];

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  type: z.enum(CONVERSATION_TYPES),
  title: z.string().nullable(),
  avatar_url: z.string().nullable(),
  created_by: z.string().uuid(),
  is_archived: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  last_message_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ConversationMemberSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(CONVERSATION_MEMBER_ROLES),
  is_muted: z.boolean(),
  joined_at: z.string(),
  left_at: z.string().nullable(),
  user: UserSchema.pick({ id: true, display_name: true, avatar_url: true }).optional(),
});

export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  content: z.string().nullable(),
  message_type: z.enum(MESSAGE_TYPES),
  reply_to_id: z.string().uuid().nullable(),
  media_id: z.string().uuid().nullable(),
  shared_content: z.record(z.string(), z.unknown()).nullable(),
  edited_at: z.string().nullable(),
  deleted_at: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
  sender: UserSchema.pick({ id: true, display_name: true, avatar_url: true }).optional(),
});

export const MessageReactionSchema = z.object({
  id: z.string().uuid(),
  message_id: z.string().uuid(),
  user_id: z.string().uuid(),
  emoji: z.string(),
  created_at: z.string(),
});

export const ReadStateSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  user_id: z.string().uuid(),
  last_read_message_id: z.string().uuid().nullable(),
  last_read_at: z.string(),
});

export const NotificationEventSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid().nullable(),
  user_id: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  data: z.record(z.string(), z.unknown()).default({}),
  channel: z.enum(NOTIFICATION_CHANNELS),
  status: z.string(),
  source_id: z.string().uuid().nullable(),
  source_type: z.string().nullable(),
  created_at: z.string(),
});

// ============================================================================
// Phase 7: Legacy Vault, Inheritance, Search
// ============================================================================

export const VAULT_STATUSES = ['active', 'sealed', 'released'] as const;
export type VaultStatus = (typeof VAULT_STATUSES)[number];

export const RELEASE_CONDITIONS = ['manual', 'time_trigger', 'death_verification'] as const;
export type ReleaseCondition = (typeof RELEASE_CONDITIONS)[number];

export const AFTER_DEATH_ACTIONS = ['memorialize', 'delete', 'transfer'] as const;
export type AfterDeathAction = (typeof AFTER_DEATH_ACTIONS)[number];

export const MEMORIAL_STATES = ['active', 'pending_memorial', 'memorialized'] as const;
export type MemorialState = (typeof MEMORIAL_STATES)[number];

export const VAULT_CONTENT_TYPES = ['letter', 'document', 'media', 'message'] as const;
export type VaultContentType = (typeof VAULT_CONTENT_TYPES)[number];

export const SEARCH_CONTENT_TYPES = ['post', 'recipe', 'event', 'message', 'member', 'trip', 'photo'] as const;
export type SearchContentType = (typeof SEARCH_CONTENT_TYPES)[number];

export const LegacyVaultSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  status: z.enum(VAULT_STATUSES),
  sealed_at: z.string().nullable(),
  released_at: z.string().nullable(),
  release_condition: z.enum(RELEASE_CONDITIONS),
  release_trigger_at: z.string().nullable(),
  requires_reauth: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});

export const VaultItemSchema = z.object({
  id: z.string().uuid(),
  vault_id: z.string().uuid(),
  content_type: z.string(),
  title: z.string().nullable(),
  content: z.string().nullable(),
  media_id: z.string().uuid().nullable(),
  sort_order: z.number(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});

export const VaultRecipientSchema = z.object({
  id: z.string().uuid(),
  vault_id: z.string().uuid(),
  user_id: z.string().uuid(),
  message: z.string().nullable(),
  notified_at: z.string().nullable(),
  viewed_at: z.string().nullable(),
  created_at: z.string(),
  display_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

export const InheritanceScenarioSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  version: z.number(),
  input_snapshot: z.record(z.string(), z.unknown()),
  output_snapshot: z.record(z.string(), z.unknown()),
  created_at: z.string(),
});

export const DigitalSuccessorSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  successor_id: z.string().uuid(),
  after_death_action: z.enum(AFTER_DEATH_ACTIONS),
  notes: z.string().nullable(),
  confirmed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  display_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

export const MemorialProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  family_id: z.string().uuid(),
  state: z.enum(MEMORIAL_STATES),
  requested_by: z.string().uuid().nullable(),
  approved_by: z.string().uuid().nullable(),
  memorial_message: z.string().nullable(),
  memorial_date: z.string().nullable(),
  requested_at: z.string().nullable(),
  approved_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const SearchResultSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  content_type: z.string(),
  content_id: z.string().uuid(),
  title: z.string().nullable(),
  body: z.string().nullable(),
  author_id: z.string().uuid().nullable(),
  visibility: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  rank: z.number(),
  headline: z.string(),
  created_at: z.string(),
});

export const ActivityLogSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  actor_id: z.string().uuid(),
  action: z.string(),
  target_type: z.string(),
  target_id: z.string().uuid(),
  summary: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
  actor_name: z.string().nullable().optional(),
  actor_avatar: z.string().nullable().optional(),
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
export type CalendarEvent = z.infer<typeof EventSchema>;
export type EventInvite = z.infer<typeof EventInviteSchema>;
export type Trip = z.infer<typeof TripSchema>;
export type TripItineraryItem = z.infer<typeof TripItineraryItemSchema>;
export type LocationShare = z.infer<typeof LocationShareSchema>;
export type Geofence = z.infer<typeof GeofenceSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;
export type RecipeStep = z.infer<typeof RecipeStepSchema>;
export type MealPlan = z.infer<typeof MealPlanSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type ConversationMember = z.infer<typeof ConversationMemberSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type MessageReaction = z.infer<typeof MessageReactionSchema>;
export type ReadState = z.infer<typeof ReadStateSchema>;
export type NotificationEvent = z.infer<typeof NotificationEventSchema>;
export type LegacyVault = z.infer<typeof LegacyVaultSchema>;
export type VaultItem = z.infer<typeof VaultItemSchema>;
export type VaultRecipient = z.infer<typeof VaultRecipientSchema>;
export type InheritanceScenario = z.infer<typeof InheritanceScenarioSchema>;
export type DigitalSuccessor = z.infer<typeof DigitalSuccessorSchema>;
export type MemorialProfile = z.infer<typeof MemorialProfileSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type ActivityLog = z.infer<typeof ActivityLogSchema>;

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
