import { describe, it, expect } from 'vitest';
import { forecast } from './capacityEngine';

describe('capacityEngine.forecast', () => {
  it('projects linear growth from a positive daily rate', () => {
    const f = forecast({ current: 100, deltaLastNDays: 70, daysWindow: 7 });
    expect(f.perDay).toBe(10);
    expect(f.d30).toBe(400);
    expect(f.d90).toBe(1000);
    expect(f.d365).toBe(3750);
  });
  it('returns zero growth on empty window', () => {
    const f = forecast({ current: 50, deltaLastNDays: 10, daysWindow: 0 });
    expect(f.perDay).toBe(0);
    expect(f.d365).toBe(50);
  });
  it('clamps negative growth to zero', () => {
    const f = forecast({ current: 100, deltaLastNDays: -50, daysWindow: 5 });
    expect(f.perDay).toBe(0);
    expect(f.d30).toBe(100);
  });
  it('handles extreme values without overflow', () => {
    const f = forecast({ current: 1e9, deltaLastNDays: 1e9, daysWindow: 1 });
    expect(Number.isFinite(f.d365)).toBe(true);
  });
});
