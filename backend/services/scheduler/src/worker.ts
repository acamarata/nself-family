import type { Pool, Logger } from '@nself-family/shared';
import { claimNextJob, completeJob, failJob, type Job } from './lib/queue.js';

export type JobHandler = (job: Job) => Promise<void>;

/**
 * Scheduler worker that polls for and processes jobs.
 * Runs continuously until stopped.
 */
export class SchedulerWorker {
  private pool: Pool;
  private logger: Logger;
  private handlers: Map<string, JobHandler> = new Map();
  private running = false;
  private pollIntervalMs: number;

  /**
   * @param pool - Database pool
   * @param logger - Logger instance
   * @param pollIntervalMs - How often to check for jobs (default 1000ms)
   */
  constructor(pool: Pool, logger: Logger, pollIntervalMs: number = 1000) {
    this.pool = pool;
    this.logger = logger;
    this.pollIntervalMs = pollIntervalMs;
  }

  /**
   * Register a handler for a specific job type.
   * @param jobType - Job type string
   * @param handler - Async function to process the job
   */
  registerHandler(jobType: string, handler: JobHandler): void {
    this.handlers.set(jobType, handler);
  }

  /**
   * Start the worker polling loop.
   */
  async start(): Promise<void> {
    this.running = true;
    this.logger.info('Scheduler worker started');

    while (this.running) {
      try {
        const job = await claimNextJob(this.pool, [...this.handlers.keys()]);
        if (job) {
          await this.processJob(job);
        } else {
          await this.sleep(this.pollIntervalMs);
        }
      } catch (error) {
        this.logger.error({ err: error }, 'Worker poll error');
        await this.sleep(this.pollIntervalMs * 2);
      }
    }
  }

  /**
   * Stop the worker gracefully.
   */
  stop(): void {
    this.running = false;
    this.logger.info('Scheduler worker stopping');
  }

  /**
   * Check if the worker is currently running.
   * @returns True if running
   */
  isRunning(): boolean {
    return this.running;
  }

  private async processJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.job_type);

    if (!handler) {
      this.logger.warn({ jobType: job.job_type }, 'No handler registered for job type');
      await failJob(this.pool, job.id, `No handler for job type: ${job.job_type}`);
      return;
    }

    const startTime = Date.now();
    this.logger.info({ jobId: job.id, jobType: job.job_type }, 'Processing job');

    try {
      await handler(job);
      await completeJob(this.pool, job.id);
      const durationMs = Date.now() - startTime;
      this.logger.info({ jobId: job.id, jobType: job.job_type, durationMs }, 'Job completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error({ jobId: job.id, jobType: job.job_type, err: error }, 'Job failed');
      await failJob(this.pool, job.id, errorMessage);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
