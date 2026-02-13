import { describe, it, expect } from 'vitest';

// Test the calendar utility functions directly

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const days: Date[] = [];
  for (let i = -startDay; i <= last.getDate() - 1 + (6 - last.getDay()); i++) {
    days.push(new Date(year, month, i + 1));
  }
  return days;
}

function getWeekDays(date: Date): Date[] {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(start.getDate() - day);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

describe('calendar utilities', () => {
  describe('getMonthDays', () => {
    it('returns days for a month including padding', () => {
      // June 2025 starts on Sunday, ends on Monday
      const days = getMonthDays(2025, 5); // June
      expect(days.length % 7).toBe(0); // Always full weeks
      expect(days.length).toBeGreaterThanOrEqual(28);
      // First day should be a Sunday
      expect(days[0].getDay()).toBe(0);
    });

    it('includes days from previous month for padding', () => {
      // March 2025 starts on Saturday
      const days = getMonthDays(2025, 2); // March
      expect(days[0].getDay()).toBe(0);
      // Some initial days should be from February
      const febDays = days.filter(d => d.getMonth() === 1);
      expect(febDays.length).toBeGreaterThan(0);
    });

    it('handles February in non-leap year', () => {
      const days = getMonthDays(2025, 1); // Feb 2025
      const febDays = days.filter(d => d.getMonth() === 1);
      expect(febDays.length).toBe(28);
    });

    it('handles February in leap year', () => {
      const days = getMonthDays(2024, 1); // Feb 2024
      const febDays = days.filter(d => d.getMonth() === 1);
      expect(febDays.length).toBe(29);
    });
  });

  describe('getWeekDays', () => {
    it('returns exactly 7 days', () => {
      const days = getWeekDays(new Date(2025, 5, 15));
      expect(days).toHaveLength(7);
    });

    it('starts on Sunday', () => {
      const days = getWeekDays(new Date(2025, 5, 18)); // Wednesday
      expect(days[0].getDay()).toBe(0);
    });

    it('ends on Saturday', () => {
      const days = getWeekDays(new Date(2025, 5, 18));
      expect(days[6].getDay()).toBe(6);
    });

    it('handles week starting on Sunday', () => {
      const sunday = new Date(2025, 5, 15); // A Sunday
      const days = getWeekDays(sunday);
      expect(days[0].getDate()).toBe(sunday.getDate());
    });

    it('returns consecutive dates', () => {
      const days = getWeekDays(new Date(2025, 5, 18));
      for (let i = 1; i < days.length; i++) {
        const diff = days[i].getDate() - days[i - 1].getDate();
        // Handle month boundaries
        expect(Math.abs(diff) === 1 || Math.abs(diff) > 20).toBe(true);
      }
    });
  });
});
