/**
 * Sprint 5.3 · Compliance Rule Engine (pure).
 */
import type { ComplianceStatus } from './complianceCatalog';

export interface ComplianceRuleInput {
  readonly id: string;
  readonly frameworkId: string;
  readonly name: string;
  readonly implemented?: boolean | null;
  readonly evidenceCount?: number | null;
  readonly lastReviewedDaysAgo?: number | null;
}

export interface EvaluatedRule {
  readonly id: string;
  readonly frameworkId: string;
  readonly name: string;
  readonly status: ComplianceStatus;
  readonly score: number; // 0..1
}

function safeNumber(n: number | null | undefined, fallback = 0): number {
  if (n === null || n === undefined) return fallback;
  if (!Number.isFinite(n)) return fallback;
  return n;
}

export function evaluateRule(rule: ComplianceRuleInput): EvaluatedRule {
  const implemented = rule.implemented === true;
  const evidence = Math.max(0, safeNumber(rule.evidenceCount, 0));
  const reviewedDays = Math.max(0, safeNumber(rule.lastReviewedDaysAgo, 999));

  let score = 0;
  if (implemented) score += 0.6;
  if (evidence > 0) score += Math.min(0.25, evidence * 0.05);
  if (reviewedDays <= 90) score += 0.15;
  else if (reviewedDays <= 180) score += 0.075;

  score = Math.max(0, Math.min(1, score));

  const status: ComplianceStatus =
    score >= 0.85 ? 'COMPLIANT' : score >= 0.5 ? 'PARTIAL' : 'NON_COMPLIANT';

  return {
    id: rule.id,
    frameworkId: rule.frameworkId,
    name: rule.name,
    status,
    score: Math.round(score * 1000) / 1000,
  };
}

export function evaluateRules(rules: readonly ComplianceRuleInput[]): EvaluatedRule[] {
  const list = rules ?? [];
  return list
    .filter((r) => r && typeof r.id === 'string')
    .map(evaluateRule)
    .sort((a, b) => (a.frameworkId + a.id).localeCompare(b.frameworkId + b.id));
}
