import type { Pool } from '@nself-family/shared';

export interface JobInput {
  job_type: string;
  payload?: Record<string, unknown>;
  priority?: number;
  max_retries?: number;
  run_at?: Date;
  is_recurring?: boolean;
  cron_expression?: string;
  idempotency_key?: string;
  created_by?: string;
}

export interface Job {
  id: string;
  job_type: string;
  payload: Record<string, unknown>;
  status: string;
  priority: number;
  max_retries: number;
  retry_count: number;
  run_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  failed_at: Date | null;
  error_message: string | null;
  is_recurring: boolean;
  cron_expression: string | null;
  idempotency_key: string | null;
  created_at: Date;
}

/**
 * Enqueue a new job. Supports idempotency via idempotency_key.
 * @param pool - Database pool
 * @param input - Job configuration
 * @returns Created job ID, or existing job ID if idempotent duplicate
 */
export async function enqueueJob(pool: Pool, input: JobInput): Promise<string> {
  // Idempotency check
  if (input.idempotency_key) {
    const existing = await pool.query<{ id: string }>(
      `SELECT id FROM scheduler.jobs WHERE idempotency_key = $1 AND status NOT IN ('dead', 'failed')`,
      [input.idempotency_key],
    );
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }
  }

  const result = await pool.query<{ id: string }>(
    `INSERT INTO scheduler.jobs
       (job_type, payload, priority, max_retries, run_at, is_recurring, cron_expression, idempotency_key, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      input.job_type,
      JSON.stringify(input.payload ?? {}),
      input.priority ?? 0,
      input.max_retries ?? 3,
      input.run_at ?? new Date(),
      input.is_recurring ?? false,
      input.cron_expression ?? null,
      input.idempotency_key ?? null,
      input.created_by ?? null,
    ],
  );
  return result.rows[0].id;
}

/**
 * Claim the next available job for processing (advisory lock pattern).
 * Uses SELECT ... FOR UPDATE SKIP LOCKED for safe concurrent access.
 * @param pool - Database pool
 * @param jobTypes - Optional filter by job types
 * @returns Next job to process, or null if none available
 */
export async function claimNextJob(pool: Pool, jobTypes?: string[]): Promise<Job | null> {
  const typeFilter = jobTypes?.length
    ? `AND job_type = ANY($1)`
    : '';
  const params = jobTypes?.length ? [jobTypes] : [];

  const result = await pool.query<Job>(
    `UPDATE scheduler.jobs
     SET status = 'running', started_at = now()
     WHERE id = (
       SELECT id FROM scheduler.jobs
       WHERE status = 'pending' AND run_at <= now() ${typeFilter}
       ORDER BY priority DESC, run_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    params,
  );

  return result.rows[0] ?? null;
}

/**
 * Mark a job as completed.
 * @param pool - Database pool
 * @param jobId - Job UUID
 */
export async function completeJob(pool: Pool, jobId: string): Promise<void> {
  await pool.query(
    `UPDATE scheduler.jobs SET status = 'completed', completed_at = now() WHERE id = $1`,
    [jobId],
  );
}

/**
 * Mark a job as failed with retry logic and exponential backoff.
 * If max retries exceeded, moves to dead letter queue.
 * @param pool - Database pool
 * @param jobId - Job UUID
 * @param errorMessage - Error description
 */
export async function failJob(pool: Pool, jobId: string, errorMessage: string): Promise<void> {
  const job = await pool.query<Job>(
    'SELECT * FROM scheduler.jobs WHERE id = $1',
    [jobId],
  );

  if (job.rows.length === 0) return;

  const current = job.rows[0];
  const newRetryCount = current.retry_count + 1;

  if (newRetryCount >= current.max_retries) {
    // Move to dead letter queue
    await pool.query(
      `INSERT INTO scheduler.dead_letter_queue
         (original_job_id, job_type, payload, error_message, retry_count, original_created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [jobId, current.job_type, JSON.stringify(current.payload), errorMessage, newRetryCount, current.created_at],
    );

    await pool.query(
      `UPDATE scheduler.jobs SET status = 'dead', failed_at = now(), error_message = $2, retry_count = $3
       WHERE id = $1`,
      [jobId, errorMessage, newRetryCount],
    );
  } else {
    // Retry with exponential backoff: 2^retryCount seconds
    const backoffSeconds = Math.pow(2, newRetryCount);
    await pool.query(
      `UPDATE scheduler.jobs
       SET status = 'pending', failed_at = now(), error_message = $2, retry_count = $3,
           run_at = now() + interval '1 second' * $4
       WHERE id = $1`,
      [jobId, errorMessage, newRetryCount, backoffSeconds],
    );
  }
}

/**
 * Get job queue depth (pending job count).
 * @param pool - Database pool
 * @returns Number of pending jobs
 */
export async function getQueueDepth(pool: Pool): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT count(*) FROM scheduler.jobs WHERE status = 'pending'`,
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Get dead letter queue entries.
 * @param pool - Database pool
 * @param limit - Max results
 * @returns Array of DLQ entries
 */
export async function getDeadLetterQueue(
  pool: Pool,
  limit: number = 50,
): Promise<Array<Record<string, unknown>>> {
  const result = await pool.query(
    'SELECT * FROM scheduler.dead_letter_queue ORDER BY dead_at DESC LIMIT $1',
    [limit],
  );
  return result.rows;
}
