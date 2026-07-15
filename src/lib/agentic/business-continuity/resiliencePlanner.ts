/**
 * Sprint 5.4 · Resilience Planner — pure.
 */
import type { AvailabilityReport } from './serviceAvailabilityEngine';
import type { FailoverReport } from './failoverPlanner';

export interface ResilienceReport {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

function gradeOf(score: number): ResilienceReport['grade'] {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function computeResilience(
  availability: AvailabilityReport,
  failover: FailoverReport,
): ResilienceReport {
  const score = Math.round(availability.score * 0.6 + failover.score * 0.4);
  const bounded = Math.max(0, Math.min(100, score));
  return { score: bounded, grade: gradeOf(bounded) };
}
