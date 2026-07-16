/**
 * Sprint 5.6.3 · Executive Certification — final label + badge derivation.
 */
import type { EnterpriseScoreV3 } from './enterpriseScoreV3';
import type { GaFinalDecisionReport } from './gaFinalDecision';

export type ExecutiveCertLabel =
  | 'ENTERPRISE GENERAL AVAILABILITY'
  | 'ENTERPRISE RELEASE CANDIDATE'
  | 'ENTERPRISE BETA'
  | 'ENTERPRISE ALPHA';

export interface ExecutiveCertReport {
  readonly label: ExecutiveCertLabel;
  readonly grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  readonly issuedFor: string;
}

const gradeFor = (s: number): ExecutiveCertReport['grade'] =>
  s >= 95 ? 'A+' : s >= 88 ? 'A' : s >= 78 ? 'B' : s >= 65 ? 'C' : s >= 50 ? 'D' : 'F';

export function issueExecutiveCertification(
  score: EnterpriseScoreV3,
  decision: GaFinalDecisionReport,
): ExecutiveCertReport {
  const label: ExecutiveCertLabel =
    decision.status === 'GA_CERTIFIED' ? 'ENTERPRISE GENERAL AVAILABILITY' :
    score.enterpriseScore >= 78 ? 'ENTERPRISE RELEASE CANDIDATE' :
    score.enterpriseScore >= 60 ? 'ENTERPRISE BETA' : 'ENTERPRISE ALPHA';
  return {
    label,
    grade: gradeFor(score.enterpriseScore),
    issuedFor: `Enterprise Score ${score.enterpriseScore} · GA Score ${score.gaScore}`,
  };
}
