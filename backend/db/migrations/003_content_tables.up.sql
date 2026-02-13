-- Migration 003: Content & Media Tables
-- Phase 2, Task 3 (P2-T03)
-- Creates: posts, post_assets, media_items, media_variants, live_events,
--          event_markers, stream_sessions, device_registrations, device_heartbeats,
--          inheritance_scenarios, audit_events

BEGIN;

-- ============================================================================
-- Custom types for content
-- ============================================================================

CREATE TYPE public.post_type AS ENUM (
  'text', 'photo', 'video', 'album', 'event', 'recipe', 'milestone'
);

CREATE TYPE public.visibility_level AS ENUM (
  'family', 'adults_only', 'private', 'public'
);

CREATE TYPE public.processing_status AS ENUM (
  'pending', 'processing', 'completed', 'failed'
);

-- ============================================================================
-- Posts table (family-scoped)
-- ============================================================================

CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  post_type public.post_type NOT NULL DEFAULT 'text',
  title TEXT,
  body TEXT,
  visibility public.visibility_level NOT NULL DEFAULT 'family',
  metadata JSONB NOT NULL DEFAULT '{}',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_family ON public.posts (family_id);
CREATE INDEX idx_posts_author ON public.posts (author_id);
CREATE INDEX idx_posts_family_feed ON public.posts (family_id, created_at DESC)
  WHERE is_deleted = false;
CREATE INDEX idx_posts_type ON public.posts (family_id, post_type);
CREATE INDEX idx_posts_pinned ON public.posts (family_id)
  WHERE is_pinned = true AND is_deleted = false;

-- ============================================================================
-- Media items table (family-scoped)
-- ============================================================================

CREATE TABLE public.media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  processing_status public.processing_status NOT NULL DEFAULT 'pending',
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_items_family ON public.media_items (family_id);
CREATE INDEX idx_media_items_uploader ON public.media_items (uploaded_by);
CREATE INDEX idx_media_items_status ON public.media_items (processing_status)
  WHERE processing_status != 'completed';
CREATE INDEX idx_media_items_checksum ON public.media_items (checksum_sha256);

-- ============================================================================
-- Media variants (thumbnails, resized versions)
-- ============================================================================

CREATE TABLE public.media_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  variant_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_variants_item ON public.media_variants (media_item_id);
CREATE UNIQUE INDEX idx_media_variants_type ON public.media_variants (media_item_id, variant_type);

-- ============================================================================
-- Post assets (links posts to media)
-- ============================================================================

CREATE TABLE public.post_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_assets_post ON public.post_assets (post_id, sort_order);
CREATE INDEX idx_post_assets_media ON public.post_assets (media_item_id);

-- ============================================================================
-- Live events table (family-scoped)
-- ============================================================================

CREATE TABLE public.live_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'general',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  location_geo JSONB,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  visibility public.visibility_level NOT NULL DEFAULT 'family',
  metadata JSONB NOT NULL DEFAULT '{}',
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_live_events_family ON public.live_events (family_id);
CREATE INDEX idx_live_events_date ON public.live_events (family_id, starts_at);
CREATE INDEX idx_live_events_upcoming ON public.live_events (family_id, starts_at)
  WHERE is_cancelled = false AND starts_at > now();

-- ============================================================================
-- Event markers (milestones within events)
-- ============================================================================

CREATE TABLE public.event_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.live_events(id) ON DELETE CASCADE,
  marker_type TEXT NOT NULL,
  label TEXT NOT NULL,
  timestamp_offset_ms INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_markers_event ON public.event_markers (event_id);

-- ============================================================================
-- Stream sessions (for live streaming)
-- ============================================================================

CREATE TABLE public.stream_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.live_events(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  media_item_id UUID REFERENCES public.media_items(id) ON DELETE SET NULL,
  stream_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stream_sessions_event ON public.stream_sessions (event_id);
CREATE INDEX idx_stream_sessions_user ON public.stream_sessions (user_id);
CREATE INDEX idx_stream_sessions_active ON public.stream_sessions (status)
  WHERE status = 'active';

-- ============================================================================
-- Device registrations (family-scoped)
-- ============================================================================

CREATE TABLE public.device_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  device_token TEXT,
  platform TEXT NOT NULL,
  push_endpoint TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_registrations_family ON public.device_registrations (family_id);
CREATE INDEX idx_device_registrations_user ON public.device_registrations (user_id);

-- ============================================================================
-- Device heartbeats
-- ============================================================================

CREATE TABLE public.device_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.device_registrations(id) ON DELETE CASCADE,
  ip_address INET,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_heartbeats_device ON public.device_heartbeats (device_id, created_at DESC);

-- ============================================================================
-- Inheritance scenarios (for legacy vault - Phase 7 uses, schema now)
-- ============================================================================

CREATE TABLE public.inheritance_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  beneficiaries JSONB NOT NULL DEFAULT '[]',
  conditions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inheritance_family ON public.inheritance_scenarios (family_id);
CREATE INDEX idx_inheritance_user ON public.inheritance_scenarios (user_id);

-- ============================================================================
-- Audit events (append-only, immutable)
-- ============================================================================

CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  subject_id TEXT,
  subject_type TEXT,
  old_state JSONB,
  new_state JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_family ON public.audit_events (family_id);
CREATE INDEX idx_audit_events_actor ON public.audit_events (actor_id);
CREATE INDEX idx_audit_events_type ON public.audit_events (event_type);
CREATE INDEX idx_audit_events_time ON public.audit_events (created_at DESC);
CREATE INDEX idx_audit_events_subject ON public.audit_events (subject_type, subject_id);

-- Prevent updates and deletes on audit_events (immutability rule)
CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable. Updates and deletes are not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();

CREATE TRIGGER trg_audit_no_delete
  BEFORE DELETE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();

-- ============================================================================
-- Apply updated_at triggers to new tables
-- ============================================================================

CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_media_items_updated_at
  BEFORE UPDATE ON public.media_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_live_events_updated_at
  BEFORE UPDATE ON public.live_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_device_registrations_updated_at
  BEFORE UPDATE ON public.device_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_inheritance_updated_at
  BEFORE UPDATE ON public.inheritance_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
