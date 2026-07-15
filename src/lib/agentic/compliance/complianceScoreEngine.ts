/**
 * Sprint 5.3 · Compliance Score Engine (pure).
 */
import type { EvaluatedRule } from './complianceRuleEngine';
import type { ComplianceStatus } from './complianceCatalog';

export interface ComplianceScore {
  readonly score: number; // 0..100
  readonly status: ComplianceStatus;
  readonly compliant: number;
  readonly partial: number;
  readonly nonCompliant: number;
  readonly total: number;
}

export function computeComplianceScore(rules: readonly EvaluatedRule[]): ComplianceScore {
  const list = rules ?? [];
  const total = list.length;
  if (total === 0) {
    return { score: 0, status: 'NON_COMPLIANT', compliant: 0, partial: 0, nonCompliant: 0, total: 0 };
  }
  let compliant = 0;
  let partial = 0;
  let nonCompliant = 0;
  let sum = 0;
  for (const r of list) {
    sum += r.score;
    if (r.status === 'COMPLIANT') compliant++;
    else if (r.status === 'PARTIAL') partial++;
    else nonCompliant++;
  }
  const score = Math.round((sum / total) * 100);
  const status: ComplianceStatus =
    score >= 85 ? 'COMPLIANT' : score >= 50 ? 'PARTIAL' : 'NON_COMPLIANT';
  return { score, status, compliant, partial, nonCompliant, total };
}
