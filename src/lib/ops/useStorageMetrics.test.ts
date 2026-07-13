import { describe, it, expect } from 'vitest';
import { summarize, BucketMetric } from './useStorageMetrics';

const mk = (o: Partial<BucketMetric>): BucketMetric => ({
  bucket: 'x', objects: 0, bytes: 0, lastUpload: null, firstUpload: null,
  bytes24h: 0, bytes7d: 0, bytes30d: 0, ...o,
});

describe('storage metrics summarize', () => {
  it('computes totals and largest bucket', () => {
    const s = summarize([
      mk({ bucket: 'a', objects: 2, bytes: 500 }),
      mk({ bucket: 'b', objects: 10, bytes: 5000 }),
    ]);
    expect(s.totals.bytes).toBe(5500);
    expect(s.totals.objects).toBe(12);
    expect(s.largest?.bucket).toBe('b');
    expect(s.source).toBe('live');
  });

  it('flags empty buckets and computes forecast from 30d window', () => {
    const s = summarize([
      mk({ bucket: 'empty', objects: 0, bytes: 0 }),
      mk({ bucket: 'busy', objects: 5, bytes: 1000, bytes30d: 300, bytes24h: 10 }),
    ]);
    expect(s.totals.emptyBuckets).toBe(1);
    expect(s.forecast.proj30dBytes).toBe(300);        // 300/30*30
    expect(s.forecast.proj1yBytes).toBeCloseTo(3650); // 300/30*365
    expect(s.alerts.some(a => a.bucket === 'empty' && a.level === 'info')).toBe(true);
  });

  it('raises spike alert when 24h > 3× daily average', () => {
    const s = summarize([mk({ bucket: 'spike', objects: 1, bytes: 10, bytes30d: 300, bytes24h: 100 })]);
    expect(s.alerts.some(a => a.message.includes('Pico'))).toBe(true);
  });
});
