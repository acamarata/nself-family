import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enqueueJob, claimNextJob, completeJob, failJob, getQueueDepth, getDeadLetterQueue } from './queue.js';

const mockPool = {
  query: vi.fn().mockResolvedValue({ rows: [{ id: 'job-1' }], rowCount: 1 }),
} as any;

describe('queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('enqueueJob', () => {
    it('creates a new job', async () => {
      const id = await enqueueJob(mockPool, { job_type: 'test.job' });
      expect(id).toBe('job-1');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scheduler.jobs'),
        expect.arrayContaining(['test.job']),
      );
    });

    it('returns existing job for idempotent duplicate', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'existing-1' }] });
      const id = await enqueueJob(mockPool, { job_type: 'test.job', idempotency_key: 'key-1' });
      expect(id).toBe('existing-1');
    });

    it('creates new job when no idempotent match', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // idempotency check
        .mockResolvedValueOnce({ rows: [{ id: 'new-1' }] }); // insert
      const id = await enqueueJob(mockPool, { job_type: 'test.job', idempotency_key: 'unique-key' });
      expect(id).toBe('new-1');
    });

    it('passes all options', async () => {
      const runAt = new Date('2026-02-15');
      await enqueueJob(mockPool, {
        job_type: 'media.process',
        payload: { mediaId: 'm1' },
        priority: 5,
        max_retries: 10,
        run_at: runAt,
        is_recurring: true,
        cron_expression: '0 * * * *',
        created_by: 'scheduler',
      });
      const params = mockPool.query.mock.calls[0][1];
      expect(params[0]).toBe('media.process');
      expect(params[1]).toBe('{"mediaId":"m1"}');
      expect(params[2]).toBe(5);
      expect(params[3]).toBe(10);
      expect(params[4]).toBe(runAt);
      expect(params[5]).toBe(true);
      expect(params[6]).toBe('0 * * * *');
    });
  });

  describe('claimNextJob', () => {
    it('returns job when available', async () => {
      const job = {
        id: 'j1', job_type: 'test', payload: {}, status: 'running',
        priority: 0, max_retries: 3, retry_count: 0, run_at: new Date(),
        started_at: new Date(), completed_at: null, failed_at: null,
        error_message: null, is_recurring: false, cron_expression: null,
        idempotency_key: null, created_at: new Date(),
      };
      mockPool.query.mockResolvedValueOnce({ rows: [job] });
      const result = await claimNextJob(mockPool);
      expect(result).toEqual(job);
    });

    it('returns null when no jobs', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const result = await claimNextJob(mockPool);
      expect(result).toBeNull();
    });

    it('filters by job types', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      await claimNextJob(mockPool, ['media.process', 'token.cleanup']);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ANY($1)'),
        [['media.process', 'token.cleanup']],
      );
    });
  });

  describe('completeJob', () => {
    it('marks job as completed', async () => {
      await completeJob(mockPool, 'job-1');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'completed'"),
        ['job-1'],
      );
    });
  });

  describe('failJob', () => {
    it('retries when under max retries', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'j1', job_type: 'test', payload: {}, retry_count: 0, max_retries: 3, created_at: new Date() }],
      });
      await failJob(mockPool, 'j1', 'test error');
      // Should update with new retry count and backoff
      const updateCall = mockPool.query.mock.calls[1];
      expect(updateCall[0]).toContain("status = 'pending'");
    });

    it('moves to DLQ when retries exhausted', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'j1', job_type: 'test', payload: {}, retry_count: 2, max_retries: 3, created_at: new Date() }],
      });
      await failJob(mockPool, 'j1', 'final error');
      // Should insert into DLQ
      const dlqCall = mockPool.query.mock.calls[1];
      expect(dlqCall[0]).toContain('dead_letter_queue');
    });

    it('handles missing job gracefully', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      await failJob(mockPool, 'missing', 'error');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getQueueDepth', () => {
    it('returns pending job count', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '42' }] });
      const depth = await getQueueDepth(mockPool);
      expect(depth).toBe(42);
    });
  });

  describe('getDeadLetterQueue', () => {
    it('returns DLQ entries', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'd1' }, { id: 'd2' }] });
      const entries = await getDeadLetterQueue(mockPool, 10);
      expect(entries).toHaveLength(2);
    });
  });
});
