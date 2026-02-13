-- Rollback Migration 003: Content & Media Tables

BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS trg_inheritance_updated_at ON public.inheritance_scenarios;
DROP TRIGGER IF EXISTS trg_device_registrations_updated_at ON public.device_registrations;
DROP TRIGGER IF EXISTS trg_live_events_updated_at ON public.live_events;
DROP TRIGGER IF EXISTS trg_media_items_updated_at ON public.media_items;
DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
DROP TRIGGER IF EXISTS trg_audit_no_delete ON public.audit_events;
DROP TRIGGER IF EXISTS trg_audit_no_update ON public.audit_events;
DROP FUNCTION IF EXISTS public.prevent_audit_modification();

-- Drop tables (reverse dependency order)
DROP TABLE IF EXISTS public.audit_events;
DROP TABLE IF EXISTS public.inheritance_scenarios;
DROP TABLE IF EXISTS public.device_heartbeats;
DROP TABLE IF EXISTS public.device_registrations;
DROP TABLE IF EXISTS public.stream_sessions;
DROP TABLE IF EXISTS public.event_markers;
DROP TABLE IF EXISTS public.live_events;
DROP TABLE IF EXISTS public.post_assets;
DROP TABLE IF EXISTS public.media_variants;
DROP TABLE IF EXISTS public.media_items;
DROP TABLE IF EXISTS public.posts;

-- Drop custom types
DROP TYPE IF EXISTS public.processing_status;
DROP TYPE IF EXISTS public.visibility_level;
DROP TYPE IF EXISTS public.post_type;

COMMIT;
