/**
 * Sprint 5.2 · Risk Probability Engine (pure).
 */
import type { NormalizedRisk } from './enterpriseRiskEngine';

export interface ProbabilityStats {
  avg: number;
  min: number;
  max: number;
  band: 'RARE' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'ALMOST_CERTAIN';
}

export function analyzeProbability(list: NormalizedRisk[]): ProbabilityStats {
  if (list.length === 0) return { avg: 0, min: 0, max: 0, band: 'RARE' };
  let sum = 0, mn = 100, mx = 0;
  for (const r of list) {
    sum += r.probability;
    if (r.probability < mn) mn = r.probability;
    if (r.probability > mx) mx = r.probability;
  }
  const avg = Math.round(sum / list.length);
  const band: ProbabilityStats['band'] =
    avg >= 80 ? 'ALMOST_CERTAIN' :
    avg >= 60 ? 'LIKELY' :
    avg >= 40 ? 'POSSIBLE' :
    avg >= 20 ? 'UNLIKELY' : 'RARE';
  return { avg, min: mn, max: mx, band };
}
