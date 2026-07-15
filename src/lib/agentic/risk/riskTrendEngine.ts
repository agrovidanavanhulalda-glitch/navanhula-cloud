/**
 * Sprint 5.2 · Risk Trend Engine (pure, deterministic).
 * Uses velocity + inherent risk to derive synthetic historical trend windows
 * without any external calls. Deterministic per input.
 */
import type { NormalizedRisk } from './enterpriseRiskEngine';
import { inherentRisk } from './enterpriseRiskEngine';

export interface TrendPoint {
  window: '24h' | '7d' | '30d' | '90d';
  score: number;
  delta: number;
}

export interface TrendReport {
  points: TrendPoint[];
  direction: 'IMPROVING' | 'STABLE' | 'DEGRADING';
}

export function computeTrend(list: NormalizedRisk[]): TrendReport {
  if (list.length === 0) {
    return {
      points: (['24h', '7d', '30d', '90d'] as const).map((w) => ({ window: w, score: 0, delta: 0 })),
      direction: 'STABLE',
    };
  }
  const avgInh = list.reduce((s, r) => s + inherentRisk(r), 0) / list.length;
  const avgVel = list.reduce((s, r) => s + r.velocity, 0) / list.length;
  // velocity above 50 => degrading, below 50 => improving
  const drift = (avgVel - 50) / 100; // -0.5..0.5
  const windows: Array<TrendPoint['window']> = ['24h', '7d', '30d', '90d'];
  const factors = [0.25, 0.5, 1.0, 1.5];
  const points: TrendPoint[] = windows.map((w, i) => {
    const score = Math.max(0, Math.min(100, Math.round(avgInh + drift * factors[i] * 20)));
    return { window: w, score, delta: 0 };
  });
  for (let i = 0; i < points.length; i++) {
    points[i].delta = i === 0 ? 0 : points[i].score - points[i - 1].score;
  }
  const totalDrift = points[points.length - 1].score - points[0].score;
  const direction: TrendReport['direction'] =
    totalDrift > 3 ? 'DEGRADING' : totalDrift < -3 ? 'IMPROVING' : 'STABLE';
  return { points, direction };
}
