/**
 * Sprint 5.6.4 · GA Decision Engine Final — emits NOT_READY / RC / GA from evidence only.
 */
import type { AggregatedEvidence } from './evidenceAggregatorFinal';
import type { ValidationReport } from './releaseEvidenceValidator';
import type { QualityGateMatrixReport } from './qualityGateMatrix';

export type GaFinalState = 'NOT_READY' | 'RC' | 'GA';
export type GaFinalDeployment = 'NO_GO' | 'CONDITIONAL_GO' | 'GO';

export interface GaFinalDecision {
  readonly state: GaFinalState;
  readonly deployment: GaFinalDeployment;
  readonly label: string;
  readonly reason: string;
}

export function decideGaFinalState(
  agg: AggregatedEvidence,
  validation: ValidationReport,
  matrix: QualityGateMatrixReport,
): GaFinalDecision {
  const enterprise = agg.score.enterpriseScore;
  const ga = agg.score.gaScore;
  const isGa =
    validation.failCount === 0 &&
    matrix.failCount === 0 &&
    matrix.warnCount === 0 &&
    agg.completeness === 100 &&
    enterprise >= 95 &&
    ga >= 95;
  const isRc =
    !isGa &&
    validation.failCount === 0 &&
    matrix.failCount === 0 &&
    enterprise >= 78 &&
    ga >= 78;
  const state: GaFinalState = isGa ? 'GA' : isRc ? 'RC' : 'NOT_READY';
  const deployment: GaFinalDeployment = state === 'GA' ? 'GO' : state === 'RC' ? 'CONDITIONAL_GO' : 'NO_GO';
  const label =
    state === 'GA' ? '✅ ENTERPRISE GENERAL AVAILABILITY (GA)'
    : state === 'RC' ? '🟡 RELEASE CANDIDATE'
    : '❌ NOT READY';
  const reason =
    state === 'GA'
      ? `Todas as evidências satisfeitas (Enterprise ${enterprise} · GA ${ga}).`
      : state === 'RC'
      ? `${matrix.warnCount} domínio(s) em WARN · Enterprise ${enterprise} · GA ${ga}.`
      : `${matrix.failCount} FAIL · ${validation.failCount} bloqueio(s) · Enterprise ${enterprise}.`;
  return { state, deployment, label, reason };
}
