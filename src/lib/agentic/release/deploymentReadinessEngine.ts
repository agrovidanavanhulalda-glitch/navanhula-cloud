/**
 * Sprint 5.6 · Deployment Readiness Engine — pure.
 */
import type { ReadinessReport } from './readinessEngine';
import type { ReleaseChecklistReport } from './releaseChecklistEngine';

export interface DeploymentReadinessReport {
  readonly deployable: boolean;
  readonly score: number;
  readonly blockers: readonly string[];
}

export function computeDeploymentReadiness(
  readiness: ReadinessReport,
  checklist: ReleaseChecklistReport,
): DeploymentReadinessReport {
  const blockers: string[] = [];
  if (checklist.criticalFailed > 0) blockers.push(`${checklist.criticalFailed} critical checklist failure(s)`);
  if (checklist.highFailed > 0) blockers.push(`${checklist.highFailed} high-severity failure(s)`);
  if (readiness.level === 'NOT_READY') blockers.push('Overall readiness below threshold');
  const score = Math.round((readiness.gaReadiness + readiness.productionReadiness) / 2);
  return { deployable: blockers.length === 0, score, blockers };
}
