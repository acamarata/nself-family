-- Migration 002: Auth Tables
-- Phase 2, Task 2 (P2-T02)
-- Creates: auth.refresh_tokens, auth.sessions
-- Dependencies: 001_core_tables (public.users)

BEGIN;

-- ============================================================================
-- Refresh tokens (stored in auth schema for separation)
-- ============================================================================

CREATE TABLE auth.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  session_id UUID NOT NULL,
  family_chain UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_hash ON auth.refresh_tokens (token_hash);
CREATE INDEX idx_refresh_tokens_user ON auth.refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_session ON auth.refresh_tokens (session_id);
CREATE INDEX idx_refresh_tokens_family ON auth.refresh_tokens (family_chain);
CREATE INDEX idx_refresh_tokens_active ON auth.refresh_tokens (user_id)
  WHERE revoked_at IS NULL AND expires_at > now();

-- ============================================================================
-- Sessions table
-- ============================================================================

CREATE TABLE auth.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user ON auth.sessions (user_id);
CREATE INDEX idx_sessions_active ON auth.sessions (user_id) WHERE is_active = true;

-- ============================================================================
-- Cleanup function: remove expired refresh tokens (run via scheduler)
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM auth.refresh_tokens WHERE expires_at < now() - interval '7 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;
