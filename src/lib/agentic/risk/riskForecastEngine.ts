/**
 * Sprint 5.2 · Risk Forecast Engine (pure, deterministic).
 */
import type { NormalizedRisk } from './enterpriseRiskEngine';
import { inherentRisk } from './enterpriseRiskEngine';

export interface ForecastReport {
  d30: number;
  d90: number;
  d365: number;
  confidence: number; // 0-100
}

export function forecastRisk(list: NormalizedRisk[]): ForecastReport {
  if (list.length === 0) return { d30: 0, d90: 0, d365: 0, confidence: 100 };
  const avgInh = list.reduce((s, r) => s + inherentRisk(r), 0) / list.length;
  const avgVel = list.reduce((s, r) => s + r.velocity, 0) / list.length;
  const avgMit = list.reduce((s, r) => s + r.mitigation, 0) / list.length;
  const avgDet = list.reduce((s, r) => s + r.detectability, 0) / list.length;
  // Base drift from velocity minus mitigation impact
  const drift = (avgVel - avgMit) / 100; // roughly -1..1
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const d30 = clamp(avgInh + drift * 5);
  const d90 = clamp(avgInh + drift * 12);
  const d365 = clamp(avgInh + drift * 30);
  // Confidence higher when detectability is higher and dataset larger
  const confidence = clamp(40 + avgDet * 0.4 + Math.min(20, list.length * 2));
  return { d30, d90, d365, confidence };
}
