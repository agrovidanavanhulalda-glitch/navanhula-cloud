import { describe, it, expect } from 'vitest';
import { detectRootCauses } from './rootCauseEngine';

const clean = {
  rpcP95Ms: 100, rpcTimeoutRate: 0, storagePct: 10, storageGrowthGbPerDay: 0,
  telemetryPerDay: 0, workerSuccessRate: 1, queueDepth: 0, dlq: 0, fiscal30d: 0,
};

describe('rootCauseEngine.detectRootCauses', () => {
  it('returns empty on healthy signals', () => {
    expect(detectRootCauses(clean)).toEqual([]);
  });
  it('flags RPC saturation on high p95 + timeouts', () => {
    const out = detectRootCauses({ ...clean, rpcP95Ms: 1200, rpcTimeoutRate: 0.05 });
    expect(out.find(c => c.id === 'rpc-saturation')).toBeTruthy();
  });
  it('flags worker capacity when success drops and queue grows', () => {
    const out = detectRootCauses({ ...clean, workerSuccessRate: 0.7, queueDepth: 500 });
    expect(out.find(c => c.id === 'worker-capacity')?.severity).toBe('CRITICAL');
  });
  it('flags fiscal degradation and ops growth', () => {
    const out = detectRootCauses({
      ...clean, storagePct: 80, telemetryPerDay: 5000, fiscal30d: 100, dlq: 50,
    });
    const ids = out.map(c => c.id);
    expect(ids).toContain('ops-growth');
    expect(ids).toContain('fiscal-degraded');
  });
  it('tolerates null values', () => {
    const out = detectRootCauses({
      ...clean, rpcP95Ms: null, rpcTimeoutRate: null, storagePct: null, workerSuccessRate: null,
    });
    expect(Array.isArray(out)).toBe(true);
  });
});
