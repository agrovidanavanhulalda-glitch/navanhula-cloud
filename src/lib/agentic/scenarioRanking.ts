/**
 * Sprint 4.5 · Scenario Ranking (pure).
 * Deterministic tie-breaking by id keeps output stable.
 */
import type { ScenarioEvaluation } from './comparisonEngine';

export interface ScenarioRanking {
  best: ScenarioEvaluation | null;
  lowestRisk: ScenarioEvaluation | null;
  lowestCost: ScenarioEvaluation | null;
  highestBenefit: ScenarioEvaluation | null;
  highestConfidence: ScenarioEvaluation | null;
  balanced: ScenarioEvaluation | null;
}

function pick(
  list: ScenarioEvaluation[],
  score: (e: ScenarioEvaluation) => number,
  higherIsBetter = true,
): ScenarioEvaluation | null {
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => {
    const diff = higherIsBetter ? score(b) - score(a) : score(a) - score(b);
    if (diff !== 0) return diff;
    return a.scenario.id.localeCompare(b.scenario.id);
  });
  return sorted[0];
}

export function rankScenarios(evaluations: ScenarioEvaluation[]): ScenarioRanking {
  return {
    best: pick(evaluations, (e) => e.decision.score),
    lowestRisk: pick(evaluations, (e) => e.scenario.risk, false),
    lowestCost: pick(evaluations, (e) => e.cost.riskAdjusted, false),
    highestBenefit: pick(evaluations, (e) => e.scenario.benefit),
    highestConfidence: pick(evaluations, (e) => e.scenario.confidence),
    balanced: pick(
      evaluations,
      (e) =>
        e.decision.score * 0.4 +
        (100 - e.scenario.risk) * 0.2 +
        e.cost.score * 0.2 +
        e.probability.success * 0.2,
    ),
  };
}
