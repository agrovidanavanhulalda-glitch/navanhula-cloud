/**
 * Sprint 5.6 · Enterprise Summary Engine — pure.
 */
import type { GAScoreReport } from './gaScoreEngine';
import type { QualityGateReport } from './qualityGateEngine';
import type { ReadinessReport } from './readinessEngine';
import type { MaturityReport } from './enterpriseMaturityEngine';
import type { DeploymentReadinessReport } from './deploymentReadinessEngine';
import type { ReleaseStatus } from './releaseEngine';

export interface ReleaseSummary {
  readonly headline: string;
  readonly verdict: 'GO' | 'CONDITIONAL_GO' | 'NO_GO';
  readonly highlights: readonly string[];
}

export interface ReleaseSummaryInput {
  readonly score: GAScoreReport;
  readonly gate: QualityGateReport;
  readonly readiness: ReadinessReport;
  readonly maturity: MaturityReport;
  readonly deployment: DeploymentReadinessReport;
  readonly status: ReleaseStatus;
}

export function summarizeRelease(i: ReleaseSummaryInput): ReleaseSummary {
  const verdict: ReleaseSummary['verdict'] =
    i.deployment.deployable && i.gate.passed ? 'GO' :
    i.deployment.deployable ? 'CONDITIONAL_GO' : 'NO_GO';
  const headline = `Release ${i.status} · Enterprise Grade ${i.score.grade} · Maturity ${i.maturity.level}`;
  const highlights = [
    `Overall GA score: ${i.score.overall}/100`,
    `Production readiness: ${i.readiness.productionReadiness}/100`,
    `Quality gate: ${i.gate.passedCount}/${i.gate.totalCount}`,
    `Deployment: ${i.deployment.deployable ? 'READY' : 'BLOCKED'}`,
  ];
  return { headline, verdict, highlights };
}
