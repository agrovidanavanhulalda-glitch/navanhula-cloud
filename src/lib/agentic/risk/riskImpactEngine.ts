/**
 * Sprint 5.2 · Risk Impact Engine (pure).
 */
import type { NormalizedRisk } from './enterpriseRiskEngine';

export interface ImpactStats {
  avg: number;
  min: number;
  max: number;
  severity: 'NEGLIGIBLE' | 'MINOR' | 'MODERATE' | 'MAJOR' | 'CATASTROPHIC';
}

export function analyzeImpact(list: NormalizedRisk[]): ImpactStats {
  if (list.length === 0) return { avg: 0, min: 0, max: 0, severity: 'NEGLIGIBLE' };
  let sum = 0, mn = 100, mx = 0;
  for (const r of list) {
    sum += r.impact;
    if (r.impact < mn) mn = r.impact;
    if (r.impact > mx) mx = r.impact;
  }
  const avg = Math.round(sum / list.length);
  const severity: ImpactStats['severity'] =
    avg >= 80 ? 'CATASTROPHIC' :
    avg >= 60 ? 'MAJOR' :
    avg >= 40 ? 'MODERATE' :
    avg >= 20 ? 'MINOR' : 'NEGLIGIBLE';
  return { avg, min: mn, max: mx, severity };
}
