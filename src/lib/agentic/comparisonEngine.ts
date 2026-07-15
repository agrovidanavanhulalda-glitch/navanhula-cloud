/**
 * Sprint 4.5 · Comparison Engine (pure).
 */
import type { ScenarioInput } from './simulationEngine';
import { estimateImpact, type ImpactBreakdown } from './impactEngine';
import { estimateProbability, type ProbabilityBreakdown } from './probabilityEngine';
import { estimateCost, type CostBreakdown } from './costEngine';
import { estimateTimeline, type TimelineEstimate } from './timelineEngine';
import { computeDecisionScore, type DecisionScoreResult } from './decisionScore';

export interface ScenarioEvaluation {
  scenario: ScenarioInput;
  impact: ImpactBreakdown;
  probability: ProbabilityBreakdown;
  cost: CostBreakdown;
  timeline: TimelineEstimate;
  decision: DecisionScoreResult;
}

export function evaluateScenario(s: ScenarioInput): ScenarioEvaluation {
  const impact = estimateImpact(s);
  const probability = estimateProbability(s);
  const cost = estimateCost(s);
  const timeline = estimateTimeline(s);
  const decision = computeDecisionScore({
    impactOverall: impact.overall,
    successProbability: probability.success,
    confidence: probability.confidence,
    risk: s.risk,
    costScore: cost.score,
    timelineScore: timeline.score,
  });
  return { scenario: s, impact, probability, cost, timeline, decision };
}

export function evaluateAll(list: ScenarioInput[]): ScenarioEvaluation[] {
  return (list ?? []).map(evaluateScenario);
}

export interface ComparisonMatrixRow {
  id: string;
  label: string;
  kind: ScenarioInput['kind'];
  decisionScore: number;
  risk: number;
  cost: number;
  minutes: number;
  successProb: number;
  impact: number;
  confidence: number;
}

export function buildComparisonMatrix(evaluations: ScenarioEvaluation[]): ComparisonMatrixRow[] {
  return evaluations.map((e) => ({
    id: e.scenario.id,
    label: e.scenario.label,
    kind: e.scenario.kind,
    decisionScore: e.decision.score,
    risk: e.scenario.risk,
    cost: e.cost.riskAdjusted,
    minutes: e.timeline.expectedMinutes,
    successProb: e.probability.success,
    impact: e.impact.overall,
    confidence: e.scenario.confidence,
  }));
}
