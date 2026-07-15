/**
 * Sprint 4.6 · Policy Score (pure).
 */
import type { ComplianceBreakdown } from './complianceEngine';
import type { GovernanceReport } from './governanceEngine';

export type PolicyRating = 'FAILED' | 'LIMITED' | 'GOOD' | 'STRONG' | 'ENTERPRISE';

export interface PolicyScoreResult {
  score: number;
  rating: PolicyRating;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

export function classifyPolicy(score: number): PolicyRating {
  const s = clamp(score);
  if (s >= 90) return 'ENTERPRISE';
  if (s >= 75) return 'STRONG';
  if (s >= 60) return 'GOOD';
  if (s >= 40) return 'LIMITED';
  return 'FAILED';
}

export function computePolicyScore(compliance: ComplianceBreakdown, governance: GovernanceReport): PolicyScoreResult {
  const c = clamp(compliance?.score ?? 0);
  const g = clamp(governance?.score ?? 0);
  const penalty = (compliance?.blocked ?? 0) * 15 + (compliance?.nonCompliant ?? 0) * 6;
  const score = Math.round(clamp(c * 0.65 + g * 0.35 - penalty));
  return { score, rating: classifyPolicy(score) };
}
