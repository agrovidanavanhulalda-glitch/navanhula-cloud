/**
 * Sprint 5.6.4 · Enterprise Certification Report — consolidated read-only executive report.
 */
import type { PlatformSignals } from './gaEvidenceEngine';
import { aggregateEvidence, type AggregatedEvidence } from './evidenceAggregatorFinal';
import { validateEvidence, type ValidationReport } from './releaseEvidenceValidator';
import { buildQualityGateMatrix, type QualityGateMatrixReport } from './qualityGateMatrix';
import { decideGaFinalState, type GaFinalDecision } from './gaDecisionEngineFinal';

export interface EnterpriseCertificationReport {
  readonly aggregate: AggregatedEvidence;
  readonly validation: ValidationReport;
  readonly matrix: QualityGateMatrixReport;
  readonly decision: GaFinalDecision;
  readonly executiveSummary: {
    readonly headline: string;
    readonly bullets: readonly string[];
  };
}

export function generateCertificationReport(
  signals: PlatformSignals = {},
): EnterpriseCertificationReport {
  const aggregate = aggregateEvidence(signals);
  const validation = validateEvidence(aggregate);
  const matrix = buildQualityGateMatrix(aggregate);
  const decision = decideGaFinalState(aggregate, validation, matrix);
  const bullets: string[] = [
    `Enterprise Score ${aggregate.score.enterpriseScore}/100 · GA Score ${aggregate.score.gaScore}/100.`,
    `Production Readiness ${aggregate.score.productionReadiness} · Release Readiness ${aggregate.score.releaseReadiness}.`,
    `Matriz: ${matrix.passCount} PASS · ${matrix.warnCount} WARN · ${matrix.failCount} FAIL.`,
    `Validação: ${validation.failCount} FAIL · ${validation.warnCount} WARN · ${validation.infoCount} INFO.`,
    `Cobertura de evidência: ${aggregate.completeness}% (${aggregate.presentCount}/${aggregate.totalCount}).`,
    `Decisão: ${decision.state} · Deploy ${decision.deployment}.`,
  ];
  return {
    aggregate,
    validation,
    matrix,
    decision,
    executiveSummary: { headline: decision.label, bullets },
  };
}
