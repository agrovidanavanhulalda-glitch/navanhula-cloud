/**
 * Sprint 5.6.2 · Release Decision Engine — final GO / CONDITIONAL / NO_GO.
 */
import type { EnterpriseScoreV3 } from './enterpriseScoreV3';
import type { ReleaseReadinessV2Report } from './releaseReadinessV2';
import type { DeploymentDecisionReport } from './deploymentDecision';

export type ReleaseVerdict = 'GO' | 'CONDITIONAL_GO' | 'NO_GO';

export interface ReleaseDecisionReport {
  readonly verdict: ReleaseVerdict;
  readonly rationale: string;
  readonly confidence: number;
}

export function decideRelease(
  score: EnterpriseScoreV3,
  readiness: ReleaseReadinessV2Report,
  deployment: DeploymentDecisionReport,
): ReleaseDecisionReport {
  const passRatio = readiness.totalCount ? readiness.passedCount / readiness.totalCount : 0;
  const confidence = Math.round((passRatio * 0.6 + (score.enterpriseScore / 100) * 0.4) * 100);
  const verdict: ReleaseVerdict =
    deployment.deployable && readiness.gaEligible ? 'GO' :
    score.enterpriseScore >= 40 && passRatio >= 0.7 ? 'CONDITIONAL_GO' : 'NO_GO';
  const rationale =
    verdict === 'GO' ? `Deploy liberado. Score ${score.enterpriseScore}, threshold ${readiness.threshold}.` :
    verdict === 'CONDITIONAL_GO' ? `Deploy condicional. ${readiness.passedCount}/${readiness.totalCount} critérios.` :
    `Deploy bloqueado. Score ${score.enterpriseScore} abaixo do mínimo.`;
  return { verdict, rationale, confidence };
}
