/**
 * Sprint 5.6 · Enterprise Certification Engine — pure.
 */
import type { GAScoreReport } from './gaScoreEngine';
import type { QualityGateReport } from './qualityGateEngine';
import type { ReadinessReport } from './readinessEngine';

export type CertificationStatus = 'CERTIFIED' | 'CONDITIONAL' | 'DENIED';

export interface Certification {
  readonly id: string;
  readonly name: string;
  readonly status: CertificationStatus;
  readonly score: number;
}

export interface CertificationBundle {
  readonly certifications: readonly Certification[];
  readonly allCertified: boolean;
}

const decide = (score: number, gatePassed: boolean): CertificationStatus =>
  gatePassed && score >= 85 ? 'CERTIFIED' : score >= 70 ? 'CONDITIONAL' : 'DENIED';

export function issueCertifications(
  score: GAScoreReport,
  gate: QualityGateReport,
  readiness: ReadinessReport,
): CertificationBundle {
  const certifications: Certification[] = [
    { id: 'enterprise', name: 'Enterprise Certification', score: score.enterpriseScore, status: decide(score.enterpriseScore, gate.passed) },
    { id: 'ga', name: 'GA Certification', score: readiness.gaReadiness, status: decide(readiness.gaReadiness, gate.passed) },
    { id: 'production', name: 'Production Certification', score: readiness.productionReadiness, status: decide(readiness.productionReadiness, gate.passed) },
    { id: 'architecture', name: 'Architecture Certification', score: score.architectureScore, status: decide(score.architectureScore, gate.passed) },
    { id: 'operational', name: 'Operational Certification', score: score.operationalScore, status: decide(score.operationalScore, gate.passed) },
    { id: 'security', name: 'Security Certification', score: score.securityScore, status: decide(score.securityScore, gate.passed) },
    { id: 'ai', name: 'AI Certification', score: score.dimensions.aiEnterprise, status: decide(score.dimensions.aiEnterprise, gate.passed) },
    { id: 'governance', name: 'Governance Certification', score: score.dimensions.governance, status: decide(score.dimensions.governance, gate.passed) },
  ];
  return { certifications, allCertified: certifications.every((c) => c.status === 'CERTIFIED') };
}
