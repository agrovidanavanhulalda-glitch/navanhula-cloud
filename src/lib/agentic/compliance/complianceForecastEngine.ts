/**
 * Sprint 5.3 · Compliance Forecast Engine (pure, deterministic linear regression).
 */
import type { ComplianceSnapshot } from './complianceTrendEngine';

export type ForecastHorizon = '30d' | '90d' | '365d';

export interface ForecastPoint {
  readonly horizon: ForecastHorizon;
  readonly projected: number; // 0..100
  readonly confidence: number; // 0..1
}

const HORIZON_DAYS: Record<ForecastHorizon, number> = { '30d': 30, '90d': 90, '365d': 365 };

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function forecastCompliance(
  snapshots: readonly ComplianceSnapshot[],
  now: number = Date.now(),
): ForecastPoint[] {
  const list = (snapshots ?? [])
    .map((s) => ({ ts: Date.parse(s.at), score: clamp(s.score, 0, 100) }))
    .filter((s) => Number.isFinite(s.ts))
    .sort((a, b) => a.ts - b.ts);

  const horizons: ForecastHorizon[] = ['30d', '90d', '365d'];

  if (list.length < 2) {
    const last = list[list.length - 1]?.score ?? 0;
    return horizons.map((h) => ({ horizon: h, projected: Math.round(last * 100) / 100, confidence: 0 }));
  }

  const day = 24 * 60 * 60 * 1000;
  const xs = list.map((s) => (s.ts - list[0].ts) / day);
  const ys = list.map((s) => s.score);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den > 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;
  const nowDays = (now - list[0].ts) / day;
  const confidence = clamp(Math.min(1, n / 30), 0, 1);

  return horizons.map((h) => {
    const projected = clamp(intercept + slope * (nowDays + HORIZON_DAYS[h]), 0, 100);
    return {
      horizon: h,
      projected: Math.round(projected * 100) / 100,
      confidence: Math.round(confidence * 1000) / 1000,
    };
  });
}
