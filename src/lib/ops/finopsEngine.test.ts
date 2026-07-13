import { describe, it, expect } from 'vitest';
import { computeFinops, FINOPS_RATES } from './finopsEngine';

const zero = {
  storageGb: 0, bandwidthGbMonth: 0, rpcCountMonth: 0, edgeInvocMonth: 0,
  realtimeChannels: 0, workerRunsMonth: 0, dbGb: 0, companies: 0, salesMonth: 0, activeUsers: 0,
};

describe('finopsEngine.computeFinops', () => {
  it('returns zero costs for empty dataset', () => {
    const s = computeFinops(zero);
    expect(s.totalMonthly).toBe(0);
    expect(s.costPerCompany).toBe(0);
    expect(s.costPerSale).toBe(0);
    expect(s.costPerActiveUser).toBe(0);
    expect(s.costPerGb).toBe(0);
  });
  it('computes per-service costs deterministically', () => {
    const s = computeFinops({ ...zero, storageGb: 100, dbGb: 10, companies: 2, salesMonth: 4, activeUsers: 5 });
    expect(s.perService.storage).toBeCloseTo(100 * FINOPS_RATES.storagePerGbMonth, 6);
    expect(s.perService.database).toBeCloseTo(10 * FINOPS_RATES.dbPerGbMonth, 6);
    expect(s.totalMonthly).toBeGreaterThan(0);
    expect(s.costPerCompany).toBeCloseTo(s.totalMonthly / 2, 6);
    expect(s.costPerSale).toBeCloseTo(s.totalMonthly / 4, 6);
    expect(s.costPerActiveUser).toBeCloseTo(s.totalMonthly / 5, 6);
    expect(s.costPerGb).toBeCloseTo(s.totalMonthly / 110, 6);
  });
  it('handles large volume without producing NaN/Infinity', () => {
    const s = computeFinops({
      ...zero, storageGb: 1e6, bandwidthGbMonth: 1e6, rpcCountMonth: 1e9,
      edgeInvocMonth: 1e9, realtimeChannels: 1e5, workerRunsMonth: 1e9,
      dbGb: 1e4, companies: 1e4, salesMonth: 1e6, activeUsers: 1e5,
    });
    expect(Number.isFinite(s.totalMonthly)).toBe(true);
    expect(Number.isNaN(s.costPerCompany)).toBe(false);
  });
});
