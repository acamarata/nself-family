-- Rollback Migration 004: Scheduler Tables

BEGIN;

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON scheduler.jobs;
DROP TABLE IF EXISTS scheduler.dead_letter_queue;
DROP TABLE IF EXISTS scheduler.jobs;
DROP TYPE IF EXISTS scheduler.job_status;
DROP SCHEMA IF EXISTS scheduler;

COMMIT;
