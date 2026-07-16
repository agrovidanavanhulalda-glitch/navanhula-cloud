/**
 * Sprint 5.6.3 · Enterprise Final Certification — aggregator across all V3 engines.
 */
import { collectEvidence, type EvidenceBundle } from './releaseEvidenceCollector';
import { buildQualityMatrix, type QualityMatrixReport } from './enterpriseQualityMatrix';
import { computeMaturityV3, type MaturityV3Report } from './enterpriseMaturityV3';
import { buildGaChecklist, type GaChecklistReport } from './gaChecklistEngine';
import { decideGaFinal, type GaFinalDecisionReport } from './gaFinalDecision';
import { issueExecutiveCertification, type ExecutiveCertReport } from './executiveCertification';
import { evaluateQualityGate, type QualityGateInput, type QualityGateReport } from './qualityGateEngine';
import type { PlatformSignals } from './gaEvidenceEngine';

export interface EnterpriseFinalInput {
  readonly signals?: PlatformSignals;
  readonly gate?: QualityGateInput;
}

export interface EnterpriseFinalReport {
  readonly evidence: EvidenceBundle;
  readonly matrix: QualityMatrixReport;
  readonly maturity: MaturityV3Report;
  readonly gate: QualityGateReport;
  readonly checklist: GaChecklistReport;
  readonly decision: GaFinalDecisionReport;
  readonly certification: ExecutiveCertReport;
}

export function certifyEnterpriseFinal(input: EnterpriseFinalInput = {}): EnterpriseFinalReport {
  const evidence = collectEvidence(input.signals ?? {});
  const matrix = buildQualityMatrix(evidence.score);
  const maturity = computeMaturityV3(evidence.score.enterpriseScore);
  const gate = evaluateQualityGate(input.gate ?? {});
  const checklist = buildGaChecklist(evidence.score, gate);
  const decision = decideGaFinal(checklist);
  const certification = issueExecutiveCertification(evidence.score, decision);
  return { evidence, matrix, maturity, gate, checklist, decision, certification };
}
