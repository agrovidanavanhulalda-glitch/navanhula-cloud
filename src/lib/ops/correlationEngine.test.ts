import { describe, it, expect } from 'vitest';
import { correlate } from './correlationEngine';

describe('correlationEngine.correlate', () => {
  it('returns empty for a single signal', () => {
    expect(correlate([{ key: 'rpc', value: 1, delta: 0 }])).toEqual([]);
  });
  it('scores identical vectors near 1', () => {
    const edges = correlate([
      { key: 'rpc', value: 0.5, delta: 0.1 },
      { key: 'storage', value: 0.5, delta: 0.1 },
    ]);
    expect(edges[0].score).toBeCloseTo(1, 5);
  });
  it('yields zero on all-zero vectors', () => {
    const edges = correlate([
      { key: 'rpc', value: 0, delta: 0 },
      { key: 'storage', value: 0, delta: 0 },
    ]);
    expect(edges[0].score).toBe(0);
  });
  it('sorts by absolute score descending', () => {
    const edges = correlate([
      { key: 'rpc', value: 1, delta: 0 },
      { key: 'storage', value: 0.9, delta: 0.05 },
      { key: 'queue', value: 0, delta: 1 },
    ]);
    for (let i = 1; i < edges.length; i++) {
      expect(Math.abs(edges[i - 1].score)).toBeGreaterThanOrEqual(Math.abs(edges[i].score));
    }
  });
});
