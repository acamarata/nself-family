-- Rollback Migration 001: Core Tables
-- Drops all tables and types created in 001_core_tables.up.sql
-- Order: reverse of creation (respects foreign key dependencies)

BEGIN;

-- Drop triggers first
DROP TRIGGER IF EXISTS trg_user_app_roles_updated_at ON public.user_app_roles;
DROP TRIGGER IF EXISTS trg_relationships_updated_at ON public.relationships;
DROP TRIGGER IF EXISTS trg_family_members_updated_at ON public.family_members;
DROP TRIGGER IF EXISTS trg_families_updated_at ON public.families;
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;

-- Drop trigger function
DROP FUNCTION IF EXISTS public.set_updated_at();

-- Drop tables (reverse dependency order)
DROP TABLE IF EXISTS public.user_app_roles;
DROP TABLE IF EXISTS public.apps;
DROP TABLE IF EXISTS public.relationships;
DROP TABLE IF EXISTS public.family_members;
DROP TABLE IF EXISTS public.families;
DROP TABLE IF EXISTS public.users;

-- Drop custom types
DROP TYPE IF EXISTS public.lifecycle_state;
DROP TYPE IF EXISTS public.family_role;

COMMIT;
