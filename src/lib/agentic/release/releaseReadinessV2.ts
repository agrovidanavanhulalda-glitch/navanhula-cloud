/**
 * Sprint 5.6.2 · Release Readiness V2 — dynamic gating driven by evidence,
 * not by hardcoded thresholds. Threshold = min(90th percentile of dims, 92).
 */
import type { EnterpriseScoreV3 } from './enterpriseScoreV3';

export type ReleaseStageV2 =
  | 'Enterprise GA' | 'RC-2' | 'RC-1' | 'RC' | 'Conditional GO' | 'NOT READY';

export interface DynamicCriterion {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly threshold: number;
  readonly passed: boolean;
}

export interface ReleaseReadinessV2Report {
  readonly threshold: number;
  readonly criteria: readonly DynamicCriterion[];
  readonly passedCount: number;
  readonly totalCount: number;
  readonly gaEligible: boolean;
  readonly stage: ReleaseStageV2;
}

const percentile = (vals: number[], p: number): number => {
  if (vals.length === 0) return 0;
  const sorted = [...vals].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
  return sorted[idx];
};

export function evaluateReleaseReadinessV2(score: EnterpriseScoreV3): ReleaseReadinessV2Report {
  const v = score.evidence.values;
  const dims = Object.values(v);
  // Dynamic threshold: 90th percentile of dims, floored at avg, capped at 92.
  const p90 = percentile(dims, 90);
  const dynamic = Math.max(score.avgSignal, Math.min(92, p90));
  const threshold = Math.round(dynamic);
  const criteria: DynamicCriterion[] = [
    { id: 'security', label: 'Security', value: v.security, threshold, passed: v.security >= threshold },
    { id: 'testing', label: 'Testing', value: v.testing, threshold, passed: v.testing >= threshold },
    { id: 'architecture', label: 'Architecture', value: v.architecture, threshold, passed: v.architecture >= threshold },
    { id: 'operations', label: 'Operations', value: v.operations, threshold, passed: v.operations >= threshold },
    { id: 'compliance', label: 'Compliance', value: v.compliance, threshold, passed: v.compliance >= threshold },
    { id: 'governance', label: 'Governance', value: v.governance, threshold, passed: v.governance >= threshold },
    { id: 'enterprise', label: 'Enterprise Score', value: score.enterpriseScore, threshold, passed: score.enterpriseScore >= threshold },
    { id: 'ga', label: 'GA Score', value: score.gaScore, threshold, passed: score.gaScore >= threshold },
    { id: 'production', label: 'Production Readiness', value: score.productionReadiness, threshold, passed: score.productionReadiness >= threshold },
    { id: 'critical', label: 'Zero Critical', value: score.evidence.criticalCount, threshold: 0, passed: score.evidence.criticalCount === 0 },
    { id: 'high', label: 'Zero High', value: score.evidence.highCount, threshold: 0, passed: score.evidence.highCount === 0 },
  ];
  const passedCount = criteria.filter((c) => c.passed).length;
  const totalCount = criteria.length;
  const ratio = passedCount / totalCount;
  const gaEligible = passedCount === totalCount && threshold >= 92;
  const stage: ReleaseStageV2 =
    gaEligible ? 'Enterprise GA' :
    ratio >= 0.9 ? 'RC-2' :
    ratio >= 0.8 ? 'RC-1' :
    ratio >= 0.7 ? 'RC' :
    ratio >= 0.5 ? 'Conditional GO' : 'NOT READY';
  return { threshold, criteria, passedCount, totalCount, gaEligible, stage };
}
