/**
 * Shared TypeScript types matching the database schema.
 * These types are the single source of truth for all services.
 */

// ============================================================================
// Enums (matching PostgreSQL enums)
// ============================================================================

export const FAMILY_ROLES = ['OWNER', 'ADMIN', 'ADULT_MEMBER', 'YOUTH_MEMBER', 'CHILD_MEMBER', 'DEVICE'] as const;
export type FamilyRole = typeof FAMILY_ROLES[number];

export const LIFECYCLE_STATES = ['active', 'inactive', 'suspended', 'pending_invite'] as const;
export type LifecycleState = typeof LIFECYCLE_STATES[number];

// ============================================================================
// Database row types
// ============================================================================

export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  avatar_url: string | null;
  profile: Record<string, unknown>;
  email_verified: boolean;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Family {
  id: string;
  name: string;
  description: string | null;
  settings: Record<string, unknown>;
  created_by: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: FamilyRole;
  lifecycle_state: LifecycleState;
  display_name: string | null;
  permissions: Record<string, unknown>;
  joined_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Relationship {
  id: string;
  family_id: string;
  user_a_id: string;
  user_b_id: string;
  relation_type: string;
  is_mahram: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface App {
  id: string;
  app_key: string;
  name: string;
  description: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: Date;
}

export interface UserAppRole {
  id: string;
  user_id: string;
  app_id: string;
  role: string;
  permissions: Record<string, unknown>;
  granted_by: string | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Auth types
// ============================================================================

export interface JwtPayload {
  sub: string;
  email: string;
  session_id: string;
  iat: number;
  exp: number;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  session_id: string;
  family_chain: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  last_active_at: Date;
  created_at: Date;
}

// ============================================================================
// API response types
// ============================================================================

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// ============================================================================
// Content types (Phase 2, Task 3)
// ============================================================================

export const POST_TYPES = ['text', 'photo', 'video', 'album', 'event', 'recipe', 'milestone'] as const;
export type PostType = typeof POST_TYPES[number];

export const VISIBILITY_LEVELS = ['family', 'adults_only', 'private', 'public'] as const;
export type VisibilityLevel = typeof VISIBILITY_LEVELS[number];

export interface Post {
  id: string;
  family_id: string;
  author_id: string;
  post_type: PostType;
  title: string | null;
  body: string | null;
  visibility: VisibilityLevel;
  metadata: Record<string, unknown>;
  is_pinned: boolean;
  is_deleted: boolean;
  deleted_at: Date | null;
  deleted_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PostAsset {
  id: string;
  post_id: string;
  media_item_id: string;
  sort_order: number;
  caption: string | null;
  created_at: Date;
}

export interface MediaItem {
  id: string;
  family_id: string;
  uploaded_by: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  checksum_sha256: string;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  metadata: Record<string, unknown>;
  processing_status: string;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MediaVariant {
  id: string;
  media_item_id: string;
  variant_type: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  created_at: Date;
}

// ============================================================================
// Audit types
// ============================================================================

export interface AuditEvent {
  id: string;
  family_id: string | null;
  event_type: string;
  actor_id: string | null;
  subject_id: string | null;
  subject_type: string | null;
  old_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

// ============================================================================
// Well-known IDs (for seeds and demo mode)
// ============================================================================

export const WELL_KNOWN_IDS = {
  DEMO_FAMILY: '00000000-0000-0000-0000-000000000001',
  APPS: {
    NFAMILY: 'a0000000-0000-0000-0000-000000000001',
    NCHAT: 'a0000000-0000-0000-0000-000000000002',
    NTV: 'a0000000-0000-0000-0000-000000000003',
  },
  USERS: {
    OWNER: 'u0000000-0000-0000-0000-000000000001',
    ADMIN: 'u0000000-0000-0000-0000-000000000002',
    HELPER: 'u0000000-0000-0000-0000-000000000003',
    USER: 'u0000000-0000-0000-0000-000000000004',
    YOUTH: 'u0000000-0000-0000-0000-000000000005',
    CHILD: 'u0000000-0000-0000-0000-000000000006',
  },
} as const;
