/**
 * Sprint 5.6.2 · Deployment Decision — pure boolean gate.
 */
import type { ReleaseReadinessV2Report } from './releaseReadinessV2';
import type { QualityGateReport } from './qualityGateEngine';

export interface DeploymentDecisionReport {
  readonly deployable: boolean;
  readonly reason: string;
  readonly blockers: readonly string[];
}

export function decideDeployment(
  readiness: ReleaseReadinessV2Report,
  gate: QualityGateReport,
): DeploymentDecisionReport {
  const blockers: string[] = [];
  if (!gate.passed) blockers.push(`Quality Gate ${gate.passedCount}/${gate.totalCount}`);
  for (const c of readiness.criteria) {
    if (!c.passed) blockers.push(`${c.label} < ${c.threshold} (${c.value})`);
  }
  const deployable = blockers.length === 0;
  const reason = deployable
    ? `Todos os ${readiness.totalCount} critérios e ${gate.totalCount} gates aprovados.`
    : `${blockers.length} bloqueio(s) impedem o deploy.`;
  return { deployable, reason, blockers };
}
