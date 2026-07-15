/**
 * Sprint 4.5 · Decision Score (pure).
 */
export type DecisionRating = 'REJECT' | 'WEAK' | 'GOOD' | 'STRONG' | 'OPTIMAL';

export interface DecisionScoreInput {
  impactOverall: number;
  successProbability: number;
  confidence: number;
  risk: number;
  costScore: number;
  timelineScore: number;
}

export interface DecisionScoreResult {
  score: number;
  rating: DecisionRating;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

export function classifyDecision(score: number): DecisionRating {
  const s = clamp(score);
  if (s >= 85) return 'OPTIMAL';
  if (s >= 70) return 'STRONG';
  if (s >= 55) return 'GOOD';
  if (s >= 35) return 'WEAK';
  return 'REJECT';
}

export function computeDecisionScore(i: DecisionScoreInput): DecisionScoreResult {
  const score = Math.round(
    clamp(i.impactOverall) * 0.2 +
      clamp(i.successProbability) * 0.25 +
      clamp(i.confidence) * 0.2 +
      (100 - clamp(i.risk)) * 0.15 +
      clamp(i.costScore) * 0.1 +
      clamp(i.timelineScore) * 0.1,
  );
  return { score, rating: classifyDecision(score) };
}
