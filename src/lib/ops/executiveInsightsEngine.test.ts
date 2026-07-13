import { describe, it, expect } from 'vitest';
import { buildExecutiveReport, type ExecutiveMetricsInput } from './executiveInsightsEngine';

const healthy: ExecutiveMetricsInput = {
  companies: 10, users: 50, sales30d: 300, salesPerDay: 10,
  fiscalDocs30d: 200, fiscalPerDay: 6, storageGb: 5, storageGrowthGbPerDay: 0.05,
  storagePct: 20, telemetryPerDay: 500, workersPerDay: 1000, workerSuccessRate: 0.99,
  queueDepth: 10, dlq: 0, rpcP95Ms: 200, errorRate: 0.01, liveSourceOk: 1,
};

describe('executiveInsightsEngine.buildExecutiveReport', () => {
  it('reports high health and no risks on healthy dataset', () => {
    const r = buildExecutiveReport(healthy);
    expect(r.businessHealth).toBeGreaterThan(80);
    expect(r.operationalRisks).toEqual([]);
    expect(r.forecast.sales.d30).toBeGreaterThan(healthy.sales30d);
  });
  it('emits risks when signals degrade', () => {
    const r = buildExecutiveReport({
      ...healthy, storagePct: 92, rpcP95Ms: 1200, queueDepth: 500, dlq: 30,
      workerSuccessRate: 0.7,
    });
    const titles = r.operationalRisks.map(x => x.title);
    expect(titles.length).toBeGreaterThanOrEqual(3);
    expect(r.recommendations.length).toBeGreaterThan(0);
    expect(r.priorityMatrix.length).toBeGreaterThan(0);
    expect(r.riskScore).toBeGreaterThan(0);
  });
  it('handles nulls and zero live source', () => {
    const r = buildExecutiveReport({
      ...healthy, companies: 0, users: 0, sales30d: 0, salesPerDay: 0,
      fiscalDocs30d: 0, fiscalPerDay: 0, storageGb: 0, storageGrowthGbPerDay: 0,
      storagePct: null, telemetryPerDay: 0, workersPerDay: 0, workerSuccessRate: null,
      queueDepth: 0, dlq: 0, rpcP95Ms: null, errorRate: null, liveSourceOk: 0,
    });
    expect(r.dataQualityScore).toBe(0);
    expect(Number.isFinite(r.businessHealth)).toBe(true);
    expect(Number.isFinite(r.riskScore)).toBe(true);
  });
});
