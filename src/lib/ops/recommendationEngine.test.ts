import { describe, it, expect } from 'vitest';
import { recommend, buildExecutiveSummary, type RecommendationInputs } from './recommendationEngine';
import type { RootCause } from './rootCauseEngine';

const clean: RecommendationInputs = {
  rpcP95Ms: 100, rpcTimeoutRate: 0, storagePct: 10, storageGrowthGbPerDay: 0,
  telemetryPerDay: 0, workerSuccessRate: 1, queueDepth: 0, dlq: 0, causes: [],
  dataQuality: 1,
};

describe('recommendationEngine.recommend', () => {
  it('returns no recommendations for a healthy platform', () => {
    expect(recommend(clean)).toEqual([]);
  });
  it('recommends worker/storage/replica on degraded signals', () => {
    const out = recommend({
      ...clean, queueDepth: 1500, storagePct: 92, rpcP95Ms: 1200,
      telemetryPerDay: 25000, dlq: 50, workerSuccessRate: 0.5,
    });
    const ids = out.map(r => r.id);
    expect(ids).toContain('add-worker');
    expect(ids).toContain('expand-storage');
    expect(ids).toContain('read-replica');
    expect(ids).toContain('archive-logs');
    expect(ids).toContain('partition-table');
    expect(ids).toContain('reduce-polling');
  });
  it('scales confidence with data quality', () => {
    const high = recommend({ ...clean, queueDepth: 300, dataQuality: 1 })[0];
    const low = recommend({ ...clean, queueDepth: 300, dataQuality: 0 })[0];
    expect(high.confidence).toBeGreaterThan(low.confidence);
  });
  it('sorts by descending confidence', () => {
    const out = recommend({
      ...clean, queueDepth: 500, storagePct: 80, rpcP95Ms: 900,
      telemetryPerDay: 6000, dlq: 25,
    });
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].confidence).toBeGreaterThanOrEqual(out[i].confidence);
    }
  });
});

describe('recommendationEngine.buildExecutiveSummary', () => {
  const cause: RootCause = {
    id: 'x', severity: 'CRITICAL', title: 'RPC saturado', reason: '', evidence: [],
  };
  it('marks READY when score high and no criticals', () => {
    const s = buildExecutiveSummary([], [], 90);
    expect(s.enterpriseReadiness).toBe('READY');
    expect(s.avgConfidence).toBe(0);
  });
  it('marks NOT_READY when score collapses', () => {
    const s = buildExecutiveSummary([], [cause, cause, cause], 30);
    expect(s.enterpriseReadiness).toBe('NOT_READY');
  });
  it('marks AT_RISK on mid conditions', () => {
    const s = buildExecutiveSummary([], [cause], 75);
    expect(s.enterpriseReadiness).toBe('AT_RISK');
  });
  it('averages recommendation confidence', () => {
    const recs = recommend({ ...clean, queueDepth: 300, storagePct: 80, dataQuality: 1 });
    const s = buildExecutiveSummary(recs, [], 85);
    expect(s.avgConfidence).toBeGreaterThan(0);
  });
});
