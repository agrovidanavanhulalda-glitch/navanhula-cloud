import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  recordTelemetry,
  flushTelemetry,
  aggregate,
  setTelemetrySink,
  type TelemetryEvent,
} from '@/lib/telemetry/buffer';

describe('Sprint 2.6 · telemetry buffer + sink contract', () => {
  beforeEach(() => setTelemetrySink(() => {}));

  it('records events without throwing and aggregates percentiles', () => {
    for (let i = 1; i <= 10; i++) {
      recordTelemetry({
        kind: 'rpc', name: 'founder_platform_stats',
        duration_ms: i * 10, success: i !== 3,
      });
    }
    const captured: TelemetryEvent[] = [];
    setTelemetrySink(b => captured.push(...b));
    flushTelemetry();
    // queueMicrotask flush
    return Promise.resolve().then(() => {
      expect(captured.length).toBe(10);
      const agg = aggregate(captured);
      const row = agg['rpc:founder_platform_stats'];
      expect(row.count).toBe(10);
      expect(row.errors).toBe(1);
      expect(row.p50).toBeGreaterThan(0);
      expect(row.p95).toBeGreaterThanOrEqual(row.p50);
    });
  });

  it('flushBatch is fire-and-forget: sink error never throws to caller', () => {
    setTelemetrySink(() => { throw new Error('boom'); });
    recordTelemetry({ kind: 'rpc', name: 'x', duration_ms: 1, success: true });
    expect(() => flushTelemetry()).not.toThrow();
  });

  it('empty flush is a no-op', () => {
    const spy = vi.fn();
    setTelemetrySink(spy);
    flushTelemetry();
    return Promise.resolve().then(() => expect(spy).not.toHaveBeenCalled());
  });
});
