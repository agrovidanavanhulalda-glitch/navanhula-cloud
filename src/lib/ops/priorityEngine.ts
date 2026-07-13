/**
 * Sprint 3.4 · Priority Engine (pure, read-only).
 * Classifies items across impact, urgency, risk, growth and cost dimensions.
 */

export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface PrioritySignals {
  /** 0..100 estimated business impact */
  impact: number;
  /** 0..100 how urgent the issue is */
  urgency: number;
  /** 0..100 risk if ignored */
  risk: number;
  /** 0..100 growth pressure amplifying it */
  growth: number;
  /** 0..100 cost pressure */
  cost: number;
}

export interface PriorityResult {
  score: number;
  level: PriorityLevel;
}

const WEIGHTS = { impact: 0.3, urgency: 0.25, risk: 0.2, growth: 0.15, cost: 0.1 } as const;

export function classifyPriority(s: PrioritySignals): PriorityResult {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const score = Math.round(
    clamp(s.impact) * WEIGHTS.impact +
    clamp(s.urgency) * WEIGHTS.urgency +
    clamp(s.risk) * WEIGHTS.risk +
    clamp(s.growth) * WEIGHTS.growth +
    clamp(s.cost) * WEIGHTS.cost,
  );
  const level: PriorityLevel =
    score >= 80 ? 'CRITICAL'
    : score >= 60 ? 'HIGH'
    : score >= 40 ? 'MEDIUM'
    : 'LOW';
  return { score, level };
}

export interface RankedItem<T> {
  item: T;
  priority: PriorityResult;
}

export function rankByPriority<T>(items: Array<{ item: T; signals: PrioritySignals }>): RankedItem<T>[] {
  return items
    .map(({ item, signals }) => ({ item, priority: classifyPriority(signals) }))
    .sort((a, b) => b.priority.score - a.priority.score);
}
