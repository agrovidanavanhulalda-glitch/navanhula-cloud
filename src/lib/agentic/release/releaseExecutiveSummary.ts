/**
 * Sprint 5.6.2 · Release Executive Summary V2 — evidence-derived narrative.
 */
import type { EnterpriseScoreV3 } from './enterpriseScoreV3';
import type { ReleaseReadinessV2Report } from './releaseReadinessV2';
import type { DeploymentDecisionReport } from './deploymentDecision';
import type { ReleaseDecisionReport } from './releaseDecisionEngine';
import type { CertificationV2Report } from './enterpriseCertificationV2';

export interface ExecutiveSummaryV2 {
  readonly headline: string;
  readonly highlights: readonly string[];
  readonly verdict: ReleaseDecisionReport['verdict'];
}

export function buildExecutiveSummary(
  score: EnterpriseScoreV3,
  readiness: ReleaseReadinessV2Report,
  deployment: DeploymentDecisionReport,
  decision: ReleaseDecisionReport,
  cert: CertificationV2Report,
): ExecutiveSummaryV2 {
  const highlights: string[] = [
    `Enterprise Score ${score.enterpriseScore}/100 · Grade ${cert.grade}.`,
    `GA Score ${score.gaScore} · Production ${score.productionReadiness} · Release ${score.releaseReadiness}.`,
    `Threshold dinâmico: ${readiness.threshold} (min ${score.minSignal} · avg ${score.avgSignal} · max ${score.maxSignal}).`,
    `Critérios: ${readiness.passedCount}/${readiness.totalCount} · Stage ${readiness.stage}.`,
    `Deploy: ${deployment.deployable ? 'liberado' : `bloqueado (${deployment.blockers.length})`}.`,
    `Confiança: ${decision.confidence}%.`,
  ];
  const headline =
    decision.verdict === 'GO' ? `Certificação ${cert.certification} concedida com base em evidências.` :
    decision.verdict === 'CONDITIONAL_GO' ? `${cert.certification} · ${readiness.stage} — deploy condicional.` :
    `${cert.certification} · ${readiness.stage} — bloqueios impedem o GA.`;
  return { headline, highlights, verdict: decision.verdict };
}
