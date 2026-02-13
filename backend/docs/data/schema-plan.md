# Backend Schema Plan

## Migrations

13 migration files covering all phases:

| Migration | Phase | Tables |
|-----------|-------|--------|
| 001_core_tables | 1 | users, families, family_members, user_app_roles |
| 002_auth_tables | 1 | auth_tokens, sessions, refresh_tokens |
| 003_content_tables | 2 | posts, post_assets, media_items, media_variants |
| 004_scheduler_tables | 2 | scheduled_jobs, job_executions |
| 005_visibility_policies | 4 | visibility_policies |
| 006_genealogy | 4 | relationships, genealogy_nodes |
| 007_calendar_trips | 5 | events, event_invites, trips, trip_itinerary_items |
| 008_recipes | 5 | recipes, recipe_ingredients, recipe_steps, meal_plans |
| 009_chat | 6 | conversations, conversation_members, messages, message_reactions, read_states |
| 010_notifications | 6 | notification_events, notification_preferences |
| 011_legacy_vault | 7 | legacy_vaults, vault_items, vault_recipients, inheritance_scenarios, digital_successors, memorial_profiles |
| 012_search_index | 7 | search_index, activity_log |
| 013_stream_gateway | 8 | stream_sessions, registered_devices, location_shares, geofences |

## Core Tables

### users

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| email | text UNIQUE | |
| display_name | text | nullable |
| avatar_url | text | nullable |
| profile | jsonb | default {} |
| email_verified | boolean | |
| is_active | boolean | |
| last_login_at | timestamptz | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### families

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | min 1 char |
| description | text | nullable |
| settings | jsonb | default {} |
| created_by | uuid FK | nullable, references users |
| is_active | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### family_members

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| family_id | uuid FK | references families |
| user_id | uuid FK | references users |
| role | text | OWNER, ADMIN, ADULT_MEMBER, YOUTH_MEMBER, CHILD_MEMBER, DEVICE |
| lifecycle_state | text | active, inactive, suspended, pending_invite |
| display_name | text | nullable |
| permissions | jsonb | default {} |
| joined_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### posts

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| family_id | uuid FK | tenant scoping |
| author_id | uuid FK | references users |
| post_type | text | text, photo, video, album, event, recipe, milestone |
| title | text | nullable |
| body | text | nullable |
| visibility | text | family, adults_only, private, public |
| metadata | jsonb | default {} |
| is_pinned | boolean | |
| is_deleted | boolean | soft delete |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### media_items

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| family_id | uuid FK | tenant scoping |
| uploaded_by | uuid FK | references users |
| file_name | text | |
| mime_type | text | |
| file_size | integer | bytes |
| storage_path | text | MinIO/S3 path |
| checksum_sha256 | text | |
| width | integer | nullable, pixels |
| height | integer | nullable, pixels |
| duration_ms | integer | nullable, video/audio |
| metadata | jsonb | EXIF, etc. |
| processing_status | text | pending, processing, completed, failed |
| is_deleted | boolean | soft delete |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### audit_events

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| family_id | uuid FK | nullable (system events) |
| event_type | text | e.g. post.created, user.login |
| actor_id | uuid FK | nullable |
| subject_id | uuid | nullable |
| subject_type | text | nullable |
| old_state | jsonb | nullable |
| new_state | jsonb | nullable |
| created_at | timestamptz | immutable |

## Multi-Tenant Isolation

Every family-scoped table includes `family_id` as a required column with:

- Foreign key to families table
- Index on family_id for efficient filtering
- Hasura row-level security filters on family_id
- All queries parameterized (no string interpolation)

## Migration Policy

- All changes via numbered migration files (NNN_description.sql)
- Each migration has up/down counterpart
- No direct production schema edits
- Destructive changes gated by explicit approval and backup
- Migrations run before app containers start

## Index Strategy

- `family_id` indexes on all tenant-scoped tables
- `created_at` indexes for feed and event timelines
- Composite indexes: (family_id, created_at) for feed queries
- GIN indexes on jsonb columns (metadata, settings, profile)
- Unique constraints: (family_id, user_id) on family_members
- Full-text search index on search_index table
