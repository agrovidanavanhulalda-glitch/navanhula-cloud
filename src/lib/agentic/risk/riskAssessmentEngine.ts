/**
 * Sprint 5.2 · Risk Assessment Engine (pure).
 */
import type { NormalizedRisk, RiskLevel } from './enterpriseRiskEngine';
import { inherentRisk } from './enterpriseRiskEngine';

export interface AssessmentRow {
  id: string;
  name: string;
  inherent: number;
  level: RiskLevel;
}

export function levelOf(score: number): RiskLevel {
  const x = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  if (x >= 75) return 'CRITICAL';
  if (x >= 50) return 'HIGH';
  if (x >= 25) return 'MEDIUM';
  return 'LOW';
}

export function assess(list: NormalizedRisk[]): AssessmentRow[] {
  return list
    .map((r) => {
      const inh = inherentRisk(r);
      return { id: r.id, name: r.name, inherent: inh, level: levelOf(inh) };
    })
    .sort((a, b) => (b.inherent - a.inherent) || a.id.localeCompare(b.id));
}
