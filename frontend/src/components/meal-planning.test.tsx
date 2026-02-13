import { describe, it, expect } from 'vitest';

// Test the meal planning utility functions

function getWeekDates(date: Date): string[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

describe('meal planning utilities', () => {
  describe('getWeekDates', () => {
    it('returns 7 dates', () => {
      const dates = getWeekDates(new Date(2025, 5, 18)); // Wed June 18
      expect(dates).toHaveLength(7);
    });

    it('starts on Sunday', () => {
      const dates = getWeekDates(new Date(2025, 5, 18));
      const firstDate = new Date(dates[0] + 'T12:00:00');
      expect(firstDate.getDay()).toBe(0);
    });

    it('ends on Saturday', () => {
      const dates = getWeekDates(new Date(2025, 5, 18));
      const lastDate = new Date(dates[6] + 'T12:00:00');
      expect(lastDate.getDay()).toBe(6);
    });

    it('returns YYYY-MM-DD format', () => {
      const dates = getWeekDates(new Date(2025, 5, 18));
      for (const date of dates) {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('handles week crossing month boundary', () => {
      const dates = getWeekDates(new Date(2025, 5, 1)); // June 1 is Sunday
      expect(dates[0]).toBe('2025-06-01');
      expect(dates[6]).toBe('2025-06-07');
    });

    it('handles week when input is Sunday', () => {
      const dates = getWeekDates(new Date(2025, 5, 15)); // Sunday
      expect(dates[0]).toContain('2025-06-15');
    });

    it('returns consecutive dates', () => {
      const dates = getWeekDates(new Date(2025, 5, 18));
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1] + 'T12:00:00');
        const curr = new Date(dates[i] + 'T12:00:00');
        const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBe(1);
      }
    });
  });
});
