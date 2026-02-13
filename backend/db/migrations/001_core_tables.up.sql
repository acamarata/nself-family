-- Migration 001: Core Tables
-- Phase 2, Task 1 (P2-T01)
-- Creates: users, families, family_members, relationships, apps, user_app_roles
-- Dependencies: uuid-ossp, pgcrypto extensions (from init scripts)

BEGIN;

-- ============================================================================
-- Custom types
-- ============================================================================

CREATE TYPE public.family_role AS ENUM (
  'OWNER',
  'ADMIN',
  'ADULT_MEMBER',
  'YOUTH_MEMBER',
  'CHILD_MEMBER',
  'DEVICE'
);

CREATE TYPE public.lifecycle_state AS ENUM (
  'active',
  'inactive',
  'suspended',
  'pending_invite'
);

-- ============================================================================
-- Users table (GLOBAL — NOT family-scoped)
-- A user can belong to multiple families and have different roles per app
-- ============================================================================

CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  profile JSONB NOT NULL DEFAULT '{}',
  email_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_email ON public.users (lower(email));
CREATE INDEX idx_users_is_active ON public.users (is_active) WHERE is_active = true;
CREATE INDEX idx_users_created_at ON public.users (created_at);

-- ============================================================================
-- Families table
-- ============================================================================

CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  settings JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_families_created_by ON public.families (created_by);
CREATE INDEX idx_families_is_active ON public.families (is_active) WHERE is_active = true;

-- ============================================================================
-- Family members junction table (family-scoped)
-- ============================================================================

CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role public.family_role NOT NULL DEFAULT 'ADULT_MEMBER',
  lifecycle_state public.lifecycle_state NOT NULL DEFAULT 'active',
  display_name TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_family_members UNIQUE (family_id, user_id)
);

CREATE INDEX idx_family_members_family ON public.family_members (family_id);
CREATE INDEX idx_family_members_user ON public.family_members (user_id);
CREATE INDEX idx_family_members_role ON public.family_members (family_id, role);
CREATE INDEX idx_family_members_active ON public.family_members (family_id)
  WHERE lifecycle_state = 'active';

-- ============================================================================
-- Relationships table (family-scoped)
-- ============================================================================

CREATE TABLE public.relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_a_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  is_mahram BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_relation CHECK (user_a_id != user_b_id),
  CONSTRAINT uq_relationship UNIQUE (family_id, user_a_id, user_b_id, relation_type)
);

CREATE INDEX idx_relationships_family ON public.relationships (family_id);
CREATE INDEX idx_relationships_user_a ON public.relationships (user_a_id);
CREATE INDEX idx_relationships_user_b ON public.relationships (user_b_id);
CREATE INDEX idx_relationships_type ON public.relationships (family_id, relation_type);

-- ============================================================================
-- Apps table (registry for monorepo SSO)
-- ============================================================================

CREATE TABLE public.apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_apps_key UNIQUE (app_key)
);

CREATE INDEX idx_apps_active ON public.apps (is_active) WHERE is_active = true;

-- ============================================================================
-- User app roles (per-app RBAC — the critical table for monorepo mode)
-- One role per user per app. Enables SSO across apps with granular permissions.
-- ============================================================================

CREATE TABLE public.user_app_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  permissions JSONB NOT NULL DEFAULT '{}',
  granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_app_role UNIQUE (user_id, app_id)
);

CREATE INDEX idx_user_app_roles_user ON public.user_app_roles (user_id);
CREATE INDEX idx_user_app_roles_app ON public.user_app_roles (app_id);
CREATE INDEX idx_user_app_roles_role ON public.user_app_roles (app_id, role);

-- ============================================================================
-- updated_at trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_families_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_family_members_updated_at
  BEFORE UPDATE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_relationships_updated_at
  BEFORE UPDATE ON public.relationships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_user_app_roles_updated_at
  BEFORE UPDATE ON public.user_app_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
