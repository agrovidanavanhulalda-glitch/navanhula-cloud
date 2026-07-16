import type { CustomerEvidence } from './types';
import { aggregateCustomerEvidence, type AggregatedEvidence } from './customerEvidenceAggregator';
import { evaluateCustomerQualityGate, type QualityGateReport } from './customerQualityGate';
import { buildCertificationMatrix, type CertificationMatrix } from './customerCertificationMatrix';
import { computeCustomerReadiness, type ReadinessReport } from './customerReadinessEngine';
import { decideCustomerGa, type GaDecision } from './customerGaDecision';
import { certifyCustomerRelease, type Certification } from './customerCertificationEngine';
import { issueExecutiveCertification, type ExecutiveCertification } from './customerExecutiveCertification';
import { summarizeCustomerRelease, type ReleaseSummary } from './customerReleaseSummary';

export interface CustomerReleaseReport {
  readonly evidence: AggregatedEvidence;
  readonly gate: QualityGateReport;
  readonly matrix: CertificationMatrix;
  readonly readiness: ReadinessReport;
  readonly decision: GaDecision;
  readonly certification: Certification;
  readonly executive: ExecutiveCertification;
  readonly summary: ReleaseSummary;
  readonly checklist: readonly { readonly key: string; readonly ok: boolean; readonly label: string }[];
}

export function buildCustomerReleaseReport(input: CustomerEvidence = {}): CustomerReleaseReport {
  const evidence = aggregateCustomerEvidence(input);
  const gate = evaluateCustomerQualityGate(input);
  const matrix = buildCertificationMatrix(input);
  const readiness = computeCustomerReadiness(input);
  const decision = decideCustomerGa(input);
  const certification = certifyCustomerRelease(input);
  const executive = issueExecutiveCertification(input);
  const summary = summarizeCustomerRelease(input);
  const checklist = [
    { key: 'completeness', ok: evidence.collected.completeness >= 100, label: 'Evidências completas' },
    { key: 'gate', ok: gate.status === 'PASS', label: 'Quality Gate PASS' },
    { key: 'weighted', ok: evidence.weighted >= 85, label: 'Score ponderado ≥ 85' },
    { key: 'production', ok: readiness.production >= 80, label: 'Production Readiness ≥ 80' },
    { key: 'noFailures', ok: gate.failures === 0, label: 'Sem falhas críticas' },
    { key: 'certification', ok: certification.level === 'GOLD' || certification.level === 'PLATINUM', label: 'Certificação GOLD+' },
  ];
  return { evidence, gate, matrix, readiness, decision, certification, executive, summary, checklist };
}
