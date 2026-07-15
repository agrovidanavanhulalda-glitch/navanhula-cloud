/**
 * Sprint 4.9 · Decision Risk Engine (pure).
 */
import type { NormalizedDecision } from './decisionIntelligenceEngine';

export type RiskLevel = 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';

export interface RiskRow {
  id: string;
  risk: number;
  level: RiskLevel;
}

export function riskLevelOf(r: number): RiskLevel {
  const x = Math.max(0, Math.min(100, Number.isFinite(r) ? r : 0));
  if (x >= 80) return 'EXTREME';
  if (x >= 60) return 'HIGH';
  if (x >= 40) return 'MODERATE';
  if (x >= 20) return 'LOW';
  return 'MINIMAL';
}

export function assessRisks(list: NormalizedDecision[]): RiskRow[] {
  return list
    .map((d) => {
      const combined = Math.round(
        Math.max(0, Math.min(100, d.risk * 0.7 + (100 - d.confidence) * 0.3)),
      );
      return { id: d.id, risk: combined, level: riskLevelOf(combined) };
    })
    .sort((a, b) => (b.risk - a.risk) || a.id.localeCompare(b.id));
}
