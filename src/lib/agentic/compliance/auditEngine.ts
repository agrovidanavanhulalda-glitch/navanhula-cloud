/**
 * Sprint 5.3 · Audit Engine (pure) — namespaced under agentic/compliance.
 * Provides audit-specific pure helpers separate from legacy agentic/auditEngine.
 */
import type { NormalizedFinding } from './findingEngine';
import type { AuditTrailEntry } from './auditTrailEngine';

export interface AuditReadinessScore {
  readonly score: number; // 0..100
  readonly openFindings: number;
  readonly activityLast30d: number;
}

export function computeAuditReadiness(
  findings: readonly NormalizedFinding[],
  trail: readonly AuditTrailEntry[],
  now: number = Date.now(),
): AuditReadinessScore {
  const openFindings = (findings ?? []).filter((f) => f.open).length;
  const cutoff = now - 30 * 24 * 60 * 60 * 1000;
  const activityLast30d = (trail ?? []).filter((e) => e.ts >= cutoff).length;
  const findingPenalty = Math.min(60, openFindings * 5);
  const activityBonus = Math.min(20, activityLast30d);
  const score = Math.max(0, Math.min(100, 80 - findingPenalty + activityBonus));
  return { score, openFindings, activityLast30d };
}
