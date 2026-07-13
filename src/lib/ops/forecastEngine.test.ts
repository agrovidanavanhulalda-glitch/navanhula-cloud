import { describe, it, expect } from 'vitest';
import { project, buildPlatformForecast } from './forecastEngine';

describe('forecastEngine.project', () => {
  it('projects deterministic linear values', () => {
    const p = project({ current: 100, perDay: 2 });
    expect(p.d7).toBe(114);
    expect(p.d30).toBe(160);
    expect(p.d90).toBe(280);
    expect(p.d365).toBe(830);
  });
  it('clamps negative rates', () => {
    const p = project({ current: 50, perDay: -100 });
    expect(p.d365).toBe(50);
  });
  it('handles zero baseline', () => {
    const p = project({ current: 0, perDay: 0 });
    expect(p.d365).toBe(0);
  });
});

describe('forecastEngine.buildPlatformForecast', () => {
  it('projects every dimension in parallel', () => {
    const f = buildPlatformForecast({
      companies: { current: 10, perDay: 1 },
      users: { current: 100, perDay: 5 },
      sales: { current: 0, perDay: 3 },
      revenue: { current: 0, perDay: 100 },
      fiscalDocs: { current: 0, perDay: 2 },
      storageGb: { current: 1, perDay: 0.1 },
      workers: { current: 0, perDay: 1000 },
      telemetry: { current: 0, perDay: 500 },
    });
    expect(f.companies.d7).toBe(17);
    expect(f.storageGb.d30).toBeCloseTo(4, 5);
  });
});
