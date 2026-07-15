/**
 * Sprint 4.9 · Decision Impact Engine (pure).
 */
import type { NormalizedDecision } from './decisionIntelligenceEngine';

export interface DecisionImpact {
  id: string;
  strategic: number;
  operational: number;
  financial: number;
  overall: number;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

export function estimateDecisionImpact(d: NormalizedDecision): DecisionImpact {
  const strategic = clamp(d.impact * 0.7 + d.benefit * 0.3);
  const operational = clamp(d.impact * 0.5 + d.urgency * 0.3 + (100 - d.risk) * 0.2);
  const financial = clamp(d.benefit * 0.6 + (100 - d.cost) * 0.4);
  const overall = clamp((strategic + operational + financial) / 3);
  return {
    id: d.id,
    strategic: Math.round(strategic),
    operational: Math.round(operational),
    financial: Math.round(financial),
    overall: Math.round(overall),
  };
}

export function estimateAllImpacts(list: NormalizedDecision[]): DecisionImpact[] {
  return list.map(estimateDecisionImpact).sort((a, b) => a.id.localeCompare(b.id));
}
