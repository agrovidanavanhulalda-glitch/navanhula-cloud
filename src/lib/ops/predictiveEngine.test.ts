import { describe, it, expect } from 'vitest';
import { daysUntil, predict } from './predictiveEngine';
import type { CapacityForecast } from './capacityEngine';

const cap = (current: number, perDay: number): CapacityForecast => ({
  current, perDay, d30: current + perDay * 30, d90: current + perDay * 90,
  d180: current + perDay * 180, d365: current + perDay * 365,
});

describe('predictiveEngine.daysUntil', () => {
  it('returns null when growth is zero or negative', () => {
    expect(daysUntil(10, 0, 100)).toBeNull();
    expect(daysUntil(10, -1, 100)).toBeNull();
  });
  it('returns 0 when already at limit', () => {
    expect(daysUntil(100, 5, 100)).toBe(0);
  });
  it('computes remaining days', () => {
    expect(daysUntil(0, 10, 100)).toBe(10);
  });
});

describe('predictiveEngine.predict', () => {
  it('emits no alerts for a healthy platform', () => {
    const out = predict({
      db: cap(1024 ** 2, 0),
      storage: cap(1024 ** 2, 0),
      storageQuotaBytes: 100 * 1024 ** 3,
      dlqCurrent: 0, dlqPerDay: 0, dlqLimit: 500,
      workerSuccessRate: 0.999,
    });
    expect(out).toEqual([]);
  });
  it('flags DB, storage, DLQ and workers when saturated', () => {
    const out = predict({
      db: cap(19 * 1024 ** 3, 200 * 1024 ** 2),
      storage: cap(70 * 1024 ** 3, 5 * 1024 ** 3),
      storageQuotaBytes: 100 * 1024 ** 3,
      dlqCurrent: 400, dlqPerDay: 20, dlqLimit: 500,
      workerSuccessRate: 0.5,
    });
    const ids = out.map(a => a.id);
    expect(ids).toContain('db-20gb');
    expect(ids).toContain('storage-80');
    expect(ids).toContain('dlq-fill');
    expect(ids).toContain('workers-saturate');
  });
  it('handles null worker rate gracefully', () => {
    const out = predict({
      db: cap(0, 0), storage: cap(0, 0),
      dlqCurrent: 0, dlqPerDay: 0, workerSuccessRate: null,
    });
    expect(out.find(a => a.id === 'workers-saturate')).toBeUndefined();
  });
});
