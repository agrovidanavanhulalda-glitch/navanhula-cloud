/**
 * Sprint 5.2 · Risk Exposure Engine (pure).
 * Distinct from src/lib/agentic/riskExposureEngine.ts (Sprint 4.8) — this
 * layer operates on NormalizedRisk from the Sprint 5.2 risk namespace.
 */
import type { NormalizedRisk } from './enterpriseRiskEngine';
import { inherentRisk } from './enterpriseRiskEngine';

export interface ExposureReport {
  totalExposure: number; // 0-100 (avg)
  peak: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  rating: 'MINIMAL' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'EXTREME';
}

export function computeExposure(list: NormalizedRisk[]): ExposureReport {
  if (list.length === 0) {
    return { totalExposure: 0, peak: 0, critical: 0, high: 0, medium: 0, low: 0, rating: 'MINIMAL' };
  }
  let sum = 0, peak = 0, critical = 0, high = 0, medium = 0, low = 0;
  for (const r of list) {
    const s = inherentRisk(r);
    sum += s;
    if (s > peak) peak = s;
    if (s >= 75) critical++;
    else if (s >= 50) high++;
    else if (s >= 25) medium++;
    else low++;
  }
  const avg = Math.round(sum / list.length);
  const rating: ExposureReport['rating'] =
    avg >= 80 ? 'EXTREME' :
    avg >= 60 ? 'HIGH' :
    avg >= 40 ? 'ELEVATED' :
    avg >= 20 ? 'MODERATE' : 'MINIMAL';
  return { totalExposure: avg, peak, critical, high, medium, low, rating };
}
