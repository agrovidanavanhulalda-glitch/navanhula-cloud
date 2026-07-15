/**
 * Sprint 4.9 · Executive Decision Engine (pure, consultative).
 * Produces executive recommendations. Never executes.
 */
import type { NormalizedDecision } from './decisionIntelligenceEngine';
import { scoreDecision } from './decisionScoreEngine';
import { riskLevelOf } from './decisionRiskEngine';

export type Recommendation = 'REJECT' | 'DEFER' | 'MONITOR' | 'APPROVE' | 'FAST_TRACK';

export interface ExecutiveRow {
  id: string;
  title: string;
  score: number;
  recommendation: Recommendation;
  rationale: string;
}

function recommend(d: NormalizedDecision, score: number): Recommendation {
  if (d.risk >= 80 || d.confidence < 25) return 'REJECT';
  if (score >= 85 && d.urgency >= 70) return 'FAST_TRACK';
  if (score >= 70) return 'APPROVE';
  if (score >= 45) return 'MONITOR';
  return 'DEFER';
}

export function generateExecutiveDecisions(list: NormalizedDecision[]): ExecutiveRow[] {
  return list
    .map((d) => {
      const { score } = scoreDecision(d);
      const rec = recommend(d, score);
      const rationale = `score=${score}, risk=${riskLevelOf(d.risk)}, confidence=${d.confidence}`;
      return { id: d.id, title: d.title, score, recommendation: rec, rationale };
    })
    .sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id));
}
