import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDistanceToNow, formatDate, formatDateTime } from './date';

describe('formatDistanceToNow', () => {
  beforeEach(() => {
    // Mock Date to a fixed point in time
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-08T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('short style (default)', () => {
    it('should return "just now" for dates less than 60 seconds ago', () => {
      const date = new Date('2026-02-08T11:59:30Z'); // 30 seconds ago
      expect(formatDistanceToNow(date)).toBe('just now');
    });

    it('should return minutes ago for dates less than 1 hour ago', () => {
      const date = new Date('2026-02-08T11:30:00Z'); // 30 minutes ago
      expect(formatDistanceToNow(date)).toBe('30m ago');
    });

    it('should return singular minute', () => {
      const date = new Date('2026-02-08T11:59:00Z'); // 1 minute ago
      expect(formatDistanceToNow(date)).toBe('1m ago');
    });

    it('should return hours ago for dates less than 24 hours ago', () => {
      const date = new Date('2026-02-08T07:00:00Z'); // 5 hours ago
      expect(formatDistanceToNow(date)).toBe('5h ago');
    });

    it('should return days ago for dates less than 7 days ago', () => {
      const date = new Date('2026-02-05T12:00:00Z'); // 3 days ago
      expect(formatDistanceToNow(date)).toBe('3d ago');
    });

    it('should return weeks ago for dates less than 4 weeks ago', () => {
      const date = new Date('2026-01-25T12:00:00Z'); // 2 weeks ago
      expect(formatDistanceToNow(date)).toBe('2w ago');
    });

    it('should return months ago for dates less than 12 months ago', () => {
      const date = new Date('2025-11-08T12:00:00Z'); // ~3 months ago
      expect(formatDistanceToNow(date)).toBe('3mo ago');
    });

    it('should return years ago for very old dates', () => {
      const date = new Date('2024-02-08T12:00:00Z'); // 2 years ago
      expect(formatDistanceToNow(date)).toBe('2y ago');
    });
  });

  describe('long style', () => {
    it('should return "just now" for dates less than 60 seconds ago', () => {
      const date = new Date('2026-02-08T11:59:30Z');
      expect(formatDistanceToNow(date, { style: 'long' })).toBe('just now');
    });

    it('should return "1 minute ago" for singular minute', () => {
      const date = new Date('2026-02-08T11:59:00Z');
      expect(formatDistanceToNow(date, { style: 'long' })).toBe('1 minute ago');
    });

    it('should return "X minutes ago" for plural minutes', () => {
      const date = new Date('2026-02-08T11:30:00Z');
      expect(formatDistanceToNow(date, { style: 'long' })).toBe('30 minutes ago');
    });

    it('should return "1 hour ago" for singular hour', () => {
      const date = new Date('2026-02-08T11:00:00Z');
      expect(formatDistanceToNow(date, { style: 'long' })).toBe('1 hour ago');
    });

    it('should return "X hours ago" for plural hours', () => {
      const date = new Date('2026-02-08T07:00:00Z');
      expect(formatDistanceToNow(date, { style: 'long' })).toBe('5 hours ago');
    });

    it('should return "1 day ago" for singular day', () => {
      const date = new Date('2026-02-07T12:00:00Z');
      expect(formatDistanceToNow(date, { style: 'long' })).toBe('1 day ago');
    });

    it('should return "X days ago" for plural days', () => {
      const date = new Date('2026-02-05T12:00:00Z');
      expect(formatDistanceToNow(date, { style: 'long' })).toBe('3 days ago');
    });

    it('should return "1 week ago" for singular week', () => {
      const date = new Date('2026-02-01T12:00:00Z');
      expect(formatDistanceToNow(date, { style: 'long' })).toBe('1 week ago');
    });

    it('should return "X weeks ago" for plural weeks', () => {
      const date = new Date('2026-01-25T12:00:00Z');
      expect(formatDistanceToNow(date, { style: 'long' })).toBe('2 weeks ago');
    });
  });
});

describe('formatDate', () => {
  it('should format a date in en-US locale', () => {
    const date = new Date('2026-02-08T12:00:00Z');
    const result = formatDate(date);
    // Result should be like "Feb 8, 2026" but may vary by locale
    expect(result).toContain('2026');
    expect(result).toContain('8');
  });
});

describe('formatDateTime', () => {
  it('should format a date with time in en-US locale', () => {
    const date = new Date('2026-02-08T12:30:00Z');
    const result = formatDateTime(date);
    // Result should contain year and some time component
    expect(result).toContain('2026');
  });
});
