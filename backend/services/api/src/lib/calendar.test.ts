import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEvent, respondToInvite, generateICalFeed } from './calendar';

function mockPool(rows: unknown[] = [], overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows, ...overrides }),
  } as any;
}

describe('calendar', () => {
  describe('createEvent', () => {
    it('inserts event with all fields', async () => {
      const pool = mockPool([{ id: 'evt-1' }]);
      const result = await createEvent(pool, {
        family_id: 'fam-1',
        title: 'Birthday Party',
        description: 'Celebrating!',
        start_at: '2025-06-15T14:00:00Z',
        end_at: '2025-06-15T18:00:00Z',
        all_day: false,
        location: 'Home',
        recurrence_rule: 'FREQ=YEARLY',
        color: '#ff0000',
        created_by: 'user-1',
      });
      expect(result).toBe('evt-1');
      expect(pool.query).toHaveBeenCalledOnce();
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO public.events');
      expect(params).toEqual([
        'fam-1', 'Birthday Party', 'Celebrating!', '2025-06-15T14:00:00Z',
        '2025-06-15T18:00:00Z', false, 'Home', 'FREQ=YEARLY', '#ff0000', 'user-1',
      ]);
    });

    it('uses defaults for optional fields', async () => {
      const pool = mockPool([{ id: 'evt-2' }]);
      const result = await createEvent(pool, {
        family_id: 'fam-1',
        title: 'Quick Meeting',
        start_at: '2025-07-01T10:00:00Z',
        created_by: 'user-2',
      });
      expect(result).toBe('evt-2');
      const params = pool.query.mock.calls[0][1];
      expect(params[2]).toBeNull(); // description
      expect(params[4]).toBeNull(); // end_at
      expect(params[5]).toBe(false); // all_day
      expect(params[6]).toBeNull(); // location
      expect(params[7]).toBeNull(); // recurrence_rule
      expect(params[8]).toBeNull(); // color
    });
  });

  describe('respondToInvite', () => {
    it('upserts invite with accepted status', async () => {
      const pool = mockPool();
      await respondToInvite(pool, 'evt-1', 'user-1', 'accepted');
      expect(pool.query).toHaveBeenCalledOnce();
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO public.event_invites');
      expect(sql).toContain('ON CONFLICT');
      expect(params).toEqual(['evt-1', 'user-1', 'accepted']);
    });

    it('upserts invite with declined status', async () => {
      const pool = mockPool();
      await respondToInvite(pool, 'evt-2', 'user-2', 'declined');
      const params = pool.query.mock.calls[0][1];
      expect(params[2]).toBe('declined');
    });

    it('upserts invite with maybe status', async () => {
      const pool = mockPool();
      await respondToInvite(pool, 'evt-3', 'user-3', 'maybe');
      const params = pool.query.mock.calls[0][1];
      expect(params[2]).toBe('maybe');
    });
  });

  describe('generateICalFeed', () => {
    it('generates valid iCal for timed events', async () => {
      const pool = mockPool([
        {
          id: 'evt-1',
          title: 'Dinner',
          description: 'Family dinner',
          start_at: '2025-06-15T18:00:00.000Z',
          end_at: '2025-06-15T20:00:00.000Z',
          all_day: false,
          location: 'Home',
          recurrence_rule: null,
        },
      ]);
      const ical = await generateICalFeed(pool, 'fam-1');
      expect(ical).toContain('BEGIN:VCALENDAR');
      expect(ical).toContain('BEGIN:VEVENT');
      expect(ical).toContain('SUMMARY:Dinner');
      expect(ical).toContain('DESCRIPTION:Family dinner');
      expect(ical).toContain('LOCATION:Home');
      expect(ical).toContain('DTSTART:');
      expect(ical).toContain('DTEND:');
      expect(ical).toContain('END:VEVENT');
      expect(ical).toContain('END:VCALENDAR');
      expect(ical).not.toContain('VALUE=DATE');
    });

    it('generates valid iCal for all-day events', async () => {
      const pool = mockPool([
        {
          id: 'evt-2',
          title: 'Holiday',
          description: null,
          start_at: '2025-12-25T00:00:00.000Z',
          end_at: '2025-12-26T00:00:00.000Z',
          all_day: true,
          location: null,
          recurrence_rule: null,
        },
      ]);
      const ical = await generateICalFeed(pool, 'fam-1');
      expect(ical).toContain('DTSTART;VALUE=DATE:');
      expect(ical).toContain('DTEND;VALUE=DATE:');
      expect(ical).not.toContain('DESCRIPTION');
      expect(ical).not.toContain('LOCATION');
    });

    it('includes recurrence rules', async () => {
      const pool = mockPool([
        {
          id: 'evt-3',
          title: 'Weekly Standup',
          description: null,
          start_at: '2025-01-06T09:00:00.000Z',
          end_at: '2025-01-06T09:30:00.000Z',
          all_day: false,
          location: null,
          recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO',
        },
      ]);
      const ical = await generateICalFeed(pool, 'fam-1');
      expect(ical).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO');
    });

    it('escapes special characters in text', async () => {
      const pool = mockPool([
        {
          id: 'evt-4',
          title: 'Meeting; Important, Urgent',
          description: 'Line1\nLine2',
          start_at: '2025-03-01T10:00:00.000Z',
          end_at: null,
          all_day: false,
          location: null,
          recurrence_rule: null,
        },
      ]);
      const ical = await generateICalFeed(pool, 'fam-1');
      expect(ical).toContain('SUMMARY:Meeting\\; Important\\, Urgent');
      expect(ical).toContain('DESCRIPTION:Line1\\nLine2');
    });

    it('returns empty calendar when no events', async () => {
      const pool = mockPool([]);
      const ical = await generateICalFeed(pool, 'fam-1');
      expect(ical).toContain('BEGIN:VCALENDAR');
      expect(ical).toContain('END:VCALENDAR');
      expect(ical).not.toContain('BEGIN:VEVENT');
    });
  });
});
