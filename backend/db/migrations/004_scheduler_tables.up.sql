-- Migration 004: Scheduler Tables
-- Phase 2, Task 6 (P2-T06)
-- Creates: scheduler.jobs, scheduler.dead_letter_queue

BEGIN;

CREATE SCHEMA IF NOT EXISTS scheduler;

-- ============================================================================
-- Job status enum
-- ============================================================================

CREATE TYPE scheduler.job_status AS ENUM (
  'pending', 'running', 'completed', 'failed', 'dead'
);

-- ============================================================================
-- Jobs table — PostgreSQL-backed job queue
-- ============================================================================

CREATE TABLE scheduler.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status scheduler.job_status NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  retry_count INTEGER NOT NULL DEFAULT 0,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  -- Recurring job support
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  cron_expression TEXT,
  -- Idempotency key (prevents duplicate job execution)
  idempotency_key TEXT,
  -- Traceability
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_pending ON scheduler.jobs (run_at, priority DESC)
  WHERE status = 'pending';
CREATE INDEX idx_jobs_type ON scheduler.jobs (job_type, status);
CREATE INDEX idx_jobs_idempotency ON scheduler.jobs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_jobs_recurring ON scheduler.jobs (job_type)
  WHERE is_recurring = true AND status != 'dead';

-- ============================================================================
-- Dead letter queue — failed jobs that exceeded retries
-- ============================================================================

CREATE TABLE scheduler.dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_job_id UUID NOT NULL,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  original_created_at TIMESTAMPTZ NOT NULL,
  dead_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dlq_job_type ON scheduler.dead_letter_queue (job_type);
CREATE INDEX idx_dlq_dead_at ON scheduler.dead_letter_queue (dead_at DESC);

-- ============================================================================
-- Updated_at trigger for jobs
-- ============================================================================

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON scheduler.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
