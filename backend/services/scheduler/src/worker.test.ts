import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchedulerWorker } from './worker.js';
import * as queue from './lib/queue.js';

vi.mock('./lib/queue.js', () => ({
  claimNextJob: vi.fn().mockResolvedValue(null),
  completeJob: vi.fn().mockResolvedValue(undefined),
  failJob: vi.fn().mockResolvedValue(undefined),
}));

const mockPool = { query: vi.fn() } as any;
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as any;

describe('SchedulerWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a worker', () => {
    const worker = new SchedulerWorker(mockPool, mockLogger, 100);
    expect(worker).toBeDefined();
    expect(worker.isRunning()).toBe(false);
  });

  it('registers handlers', () => {
    const worker = new SchedulerWorker(mockPool, mockLogger, 100);
    const handler = vi.fn();
    worker.registerHandler('test.job', handler);
    // Handler registered successfully (no throw)
  });

  it('starts and stops', async () => {
    const worker = new SchedulerWorker(mockPool, mockLogger, 50);
    worker.registerHandler('test', vi.fn());

    // Start in background and immediately stop
    const startPromise = worker.start();
    expect(worker.isRunning()).toBe(true);

    // Give it a tick to enter the loop
    await new Promise((r) => setTimeout(r, 60));
    worker.stop();
    expect(worker.isRunning()).toBe(false);

    await startPromise;
  });

  it('processes a claimed job', async () => {
    const mockJob = {
      id: 'j1', job_type: 'test.job', payload: { key: 'val' },
      status: 'running', priority: 0, max_retries: 3, retry_count: 0,
      run_at: new Date(), started_at: new Date(), completed_at: null,
      failed_at: null, error_message: null, is_recurring: false,
      cron_expression: null, idempotency_key: null, created_at: new Date(),
    };

    const handler = vi.fn().mockResolvedValue(undefined);
    const worker = new SchedulerWorker(mockPool, mockLogger, 50);
    worker.registerHandler('test.job', handler);

    // First claim returns job, then null (to stop)
    vi.mocked(queue.claimNextJob)
      .mockResolvedValueOnce(mockJob)
      .mockResolvedValue(null);

    const startPromise = worker.start();
    await new Promise((r) => setTimeout(r, 150));
    worker.stop();
    await startPromise;

    expect(handler).toHaveBeenCalledWith(mockJob);
    expect(queue.completeJob).toHaveBeenCalledWith(mockPool, 'j1');
  });

  it('handles job failure', async () => {
    const mockJob = {
      id: 'j2', job_type: 'fail.job', payload: {},
      status: 'running', priority: 0, max_retries: 3, retry_count: 0,
      run_at: new Date(), started_at: new Date(), completed_at: null,
      failed_at: null, error_message: null, is_recurring: false,
      cron_expression: null, idempotency_key: null, created_at: new Date(),
    };

    const handler = vi.fn().mockRejectedValue(new Error('Handler exploded'));
    const worker = new SchedulerWorker(mockPool, mockLogger, 50);
    worker.registerHandler('fail.job', handler);

    vi.mocked(queue.claimNextJob)
      .mockResolvedValueOnce(mockJob)
      .mockResolvedValue(null);

    const startPromise = worker.start();
    await new Promise((r) => setTimeout(r, 150));
    worker.stop();
    await startPromise;

    expect(queue.failJob).toHaveBeenCalledWith(mockPool, 'j2', 'Handler exploded');
  });

  it('warns for unregistered job type', async () => {
    const mockJob = {
      id: 'j3', job_type: 'unknown.job', payload: {},
      status: 'running', priority: 0, max_retries: 3, retry_count: 0,
      run_at: new Date(), started_at: new Date(), completed_at: null,
      failed_at: null, error_message: null, is_recurring: false,
      cron_expression: null, idempotency_key: null, created_at: new Date(),
    };

    const worker = new SchedulerWorker(mockPool, mockLogger, 50);
    worker.registerHandler('other.job', vi.fn());

    vi.mocked(queue.claimNextJob)
      .mockResolvedValueOnce(mockJob)
      .mockResolvedValue(null);

    const startPromise = worker.start();
    await new Promise((r) => setTimeout(r, 150));
    worker.stop();
    await startPromise;

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ jobType: 'unknown.job' }),
      expect.stringContaining('No handler'),
    );
    expect(queue.failJob).toHaveBeenCalled();
  });
});
