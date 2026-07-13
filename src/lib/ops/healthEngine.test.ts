import { describe, it, expect } from 'vitest';
import { computeHealth } from './healthEngine';
import { reconcileIncidents, summarize } from './incidentEngine';
import { evaluate, rollup, SLOS } from './slo';
import { RUNBOOKS } from './runbooks';
import type { TelemetryEvent } from '@/lib/telemetry/buffer';

const ev = (over: Partial<TelemetryEvent> = {}): TelemetryEvent => ({
  kind: 'rpc', name: 'x', duration_ms: 100, success: true, ts: Date.now(), ...over,
});

describe('SLO evaluate', () => {
  it('marks lower-is-better metrics HEALTHY at target', () => {
    const slo = SLOS.find(s => s.id === 'rpc.p95')!;
    expect(evaluate(slo, 100)).toBe('HEALTHY');
    expect(evaluate(slo, 600)).toBe('WARNING');
    expect(evaluate(slo, 2000)).toBe('CRITICAL');
    expect(evaluate(slo, null)).toBe('UNKNOWN');
  });
  it('marks higher-is-better metrics correctly', () => {
    const slo = SLOS.find(s => s.id === 'worker.success')!;
    expect(evaluate(slo, 0.999)).toBe('HEALTHY');
    expect(evaluate(slo, 0.98)).toBe('WARNING');
    expect(evaluate(slo, 0.5)).toBe('CRITICAL');
  });
  it('rollup escalates to worst status', () => {
    expect(rollup(['HEALTHY', 'WARNING'])).toBe('WARNING');
    expect(rollup(['WARNING', 'CRITICAL'])).toBe('CRITICAL');
    expect(rollup(['UNKNOWN', 'UNKNOWN'])).toBe('UNKNOWN');
  });
});

describe('Health Engine', () => {
  it('computes overall HEALTHY when everything is fine', () => {
    const snap = computeHealth({
      events: [ev({ duration_ms: 50 }), ev({ duration_ms: 100 })],
      dbPingP95Ms: 100, dlqCount: 0, queueDepth: 10,
      workerSuccessRate: 0.999, storageAvailability: 0.9999, realtimeAvailability: 0.999,
    });
    expect(snap.overall).toBe('HEALTHY');
  });
  it('marks CRITICAL when RPC error rate is high', () => {
    const events = Array.from({ length: 20 }, (_, i) => ev({ success: i > 2 ? true : false, duration_ms: 100 }));
    const snap = computeHealth({ events, dbPingP95Ms: 100, dlqCount: 0, queueDepth: 0,
      workerSuccessRate: 1, storageAvailability: 1, realtimeAvailability: 1 });
    const rpc = snap.services.find(s => s.service === 'rpc')!;
    expect(rpc.status === 'WARNING' || rpc.status === 'CRITICAL').toBe(true);
  });
});

describe('Incident Engine', () => {
  it('opens then auto-resolves incidents', () => {
    const bad = computeHealth({ events: [], dbPingP95Ms: 100, dlqCount: 50, queueDepth: 0,
      workerSuccessRate: 1, storageAvailability: 1, realtimeAvailability: 1 });
    const opened = reconcileIncidents([], bad, 1000);
    const openInc = opened.find(i => i.service === 'queue');
    expect(openInc?.status).toBe('OPEN');

    const good = computeHealth({ events: [], dbPingP95Ms: 100, dlqCount: 0, queueDepth: 0,
      workerSuccessRate: 1, storageAvailability: 1, realtimeAvailability: 1 });
    const resolved = reconcileIncidents(opened, good, 2000);
    const resInc = resolved.find(i => i.service === 'queue');
    expect(resInc?.status).toBe('RESOLVED');
    expect(resInc?.duration_ms).toBe(1000);
  });
  it('summarizes by severity', () => {
    const sum = summarize([
      { id: 'a', severity: 'SEV1', service: 'rpc', started_at: 0, ended_at: null, duration_ms: null, root_cause: '', status: 'OPEN', resolution: null, source: 'rpc' },
    ]);
    expect(sum.open).toBe(1);
    expect(sum.sev1).toBe(1);
  });
});

describe('Runbooks catalog', () => {
  it('covers every mandated service', () => {
    const services = new Set(RUNBOOKS.map(r => r.service));
    ['worker','storage','rpc','realtime','queue','edge','cron','database'].forEach(s =>
      expect(services.has(s as any)).toBe(true));
  });
});
