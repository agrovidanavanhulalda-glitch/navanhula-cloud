/**
 * Sprint 5.3 · Evidence Engine (pure).
 */
import type { EvaluatedRule } from './complianceRuleEngine';

export interface EvidenceSummary {
  readonly ruleId: string;
  readonly frameworkId: string;
  readonly coverage: number; // 0..1
  readonly needsAttention: boolean;
}

export function computeEvidenceCoverage(rules: readonly EvaluatedRule[]): EvidenceSummary[] {
  const list = rules ?? [];
  return list
    .map((r) => ({
      ruleId: r.id,
      frameworkId: r.frameworkId,
      coverage: r.score,
      needsAttention: r.score < 0.85,
    }))
    .sort((a, b) => (a.coverage - b.coverage) || a.ruleId.localeCompare(b.ruleId));
}
