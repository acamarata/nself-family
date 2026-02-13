-- Rollback Migration 002: Auth Tables

BEGIN;

DROP FUNCTION IF EXISTS auth.cleanup_expired_tokens();
DROP TABLE IF EXISTS auth.sessions;
DROP TABLE IF EXISTS auth.refresh_tokens;

COMMIT;
