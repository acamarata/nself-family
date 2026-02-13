import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeAuditEvent, queryAuditEvents } from './audit.js';

const mockPool = {
  query: vi.fn().mockResolvedValue({ rows: [{ id: 'audit-1' }], rowCount: 1 }),
} as any;

describe('audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('writeAuditEvent', () => {
    it('inserts an audit event', async () => {
      const id = await writeAuditEvent(mockPool, {
        family_id: 'family-1',
        event_type: 'user.login',
        actor_id: 'user-1',
      });
      expect(id).toBe('audit-1');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO public.audit_events'),
        expect.arrayContaining(['family-1', 'user.login', 'user-1']),
      );
    });

    it('handles null fields', async () => {
      await writeAuditEvent(mockPool, { event_type: 'system.startup' });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([null, 'system.startup', null]),
      );
    });

    it('serializes state objects', async () => {
      await writeAuditEvent(mockPool, {
        event_type: 'role.changed',
        old_state: { role: 'user' },
        new_state: { role: 'admin' },
      });
      const args = mockPool.query.mock.calls[0][1];
      expect(args).toContain('{"role":"user"}');
      expect(args).toContain('{"role":"admin"}');
    });
  });

  describe('queryAuditEvents', () => {
    it('queries with no filters', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: '1' }, { id: '2' }] });
      const events = await queryAuditEvents(mockPool, {});
      expect(events).toHaveLength(2);
    });

    it('applies family_id filter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      await queryAuditEvents(mockPool, { family_id: 'f1' });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('family_id = $1'),
        expect.arrayContaining(['f1']),
      );
    });

    it('applies multiple filters', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      await queryAuditEvents(mockPool, { family_id: 'f1', event_type: 'login', actor_id: 'u1' });
      const sql = mockPool.query.mock.calls[0][0];
      expect(sql).toContain('family_id = $1');
      expect(sql).toContain('event_type = $2');
      expect(sql).toContain('actor_id = $3');
    });

    it('applies since filter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const since = new Date('2026-01-01');
      await queryAuditEvents(mockPool, { since });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= $1'),
        expect.arrayContaining([since.toISOString()]),
      );
    });

    it('respects limit and offset', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      await queryAuditEvents(mockPool, {}, 10, 20);
      const params = mockPool.query.mock.calls[0][1];
      expect(params).toContain(10);
      expect(params).toContain(20);
    });
  });
});
