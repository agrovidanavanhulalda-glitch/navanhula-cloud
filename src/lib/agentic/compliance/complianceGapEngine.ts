/**
 * Sprint 5.3 · Compliance Gap Engine (pure).
 */
import type { EvaluatedRule } from './complianceRuleEngine';

export interface ComplianceGap {
  readonly id: string;
  readonly frameworkId: string;
  readonly name: string;
  readonly gap: number; // 0..1 (1 = worst)
}

export function computeGaps(rules: readonly EvaluatedRule[]): ComplianceGap[] {
  const list = rules ?? [];
  return list
    .filter((r) => r.status !== 'COMPLIANT')
    .map((r) => ({
      id: r.id,
      frameworkId: r.frameworkId,
      name: r.name,
      gap: Math.round((1 - r.score) * 1000) / 1000,
    }))
    .sort((a, b) => (b.gap - a.gap) || a.id.localeCompare(b.id));
}
