/**
 * Sprint 5.6.2 · Release Audit — deterministic trail of contributions.
 */
import type { EnterpriseScoreV3 } from './enterpriseScoreV3';
import type { ReleaseReadinessV2Report } from './releaseReadinessV2';

export interface AuditRow {
  readonly key: string;
  readonly value: number;
  readonly contribution: number;
}

export interface ReleaseAuditReport {
  readonly rows: readonly AuditRow[];
  readonly totalContribution: number;
  readonly threshold: number;
}

export function auditRelease(
  score: EnterpriseScoreV3,
  readiness: ReleaseReadinessV2Report,
): ReleaseAuditReport {
  const rows: AuditRow[] = Object.entries(score.calibration.weightedContributions).map(
    ([key, contribution]) => ({
      key,
      value: (score.evidence.values as Record<string, number>)[key] ?? 0,
      contribution,
    }),
  );
  const totalContribution = Math.round(rows.reduce((a, b) => a + b.contribution, 0) * 100) / 100;
  return { rows, totalContribution, threshold: readiness.threshold };
}
