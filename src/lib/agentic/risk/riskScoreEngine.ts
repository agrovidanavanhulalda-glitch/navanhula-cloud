/**
 * Sprint 5.2 · Risk Score Engine (pure).
 * Returns an Executive Risk Score 0-100 (higher = safer).
 */
import type { NormalizedRisk } from './enterpriseRiskEngine';
import { inherentRisk } from './enterpriseRiskEngine';

export interface ExecutiveRiskScore {
  score: number; // 0-100 (higher = safer)
  exposure: number; // avg inherent
  rating: 'CRITICAL' | 'HIGH_RISK' | 'MODERATE' | 'HEALTHY' | 'ROBUST';
}

export function computeExecutiveScore(list: NormalizedRisk[]): ExecutiveRiskScore {
  if (list.length === 0) {
    return { score: 100, exposure: 0, rating: 'ROBUST' };
  }
  const inh = list.map(inherentRisk);
  const avg = inh.reduce((s, n) => s + n, 0) / inh.length;
  const peak = inh.reduce((m, n) => (n > m ? n : m), 0);
  const avgMit = list.reduce((s, r) => s + r.mitigation, 0) / list.length;
  // Safer score: penalize avg + peak, reward mitigation.
  const raw = 100 - (avg * 0.55) - (peak * 0.25) + (avgMit * 0.2);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const rating: ExecutiveRiskScore['rating'] =
    score >= 85 ? 'ROBUST' :
    score >= 70 ? 'HEALTHY' :
    score >= 50 ? 'MODERATE' :
    score >= 30 ? 'HIGH_RISK' : 'CRITICAL';
  return { score, exposure: Math.round(avg), rating };
}
