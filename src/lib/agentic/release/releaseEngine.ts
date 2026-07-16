/**
 * Sprint 5.6 · Release Engine — pure aggregator.
 */
import { computeGAScore, type GAScoreInput, type GAScoreReport } from './gaScoreEngine';
import { evaluateQualityGate, type QualityGateInput, type QualityGateReport } from './qualityGateEngine';
import { buildReleaseChecklist, type ReleaseChecklistReport } from './releaseChecklistEngine';
import { computeReadiness, type ReadinessReport } from './readinessEngine';
import { computeDeploymentReadiness, type DeploymentReadinessReport } from './deploymentReadinessEngine';
import { computeEnterpriseMaturity, type MaturityReport } from './enterpriseMaturityEngine';
import { issueCertifications, type CertificationBundle } from './enterpriseCertificationEngine';
import { generateReleaseNotes, type ReleaseNotes } from './releaseNotesEngine';
import { summarizeRelease, type ReleaseSummary } from './enterpriseSummaryEngine';

export type ReleaseStatus = 'GA' | 'RC' | 'BETA' | 'ALPHA';

export interface ReleaseInput {
  readonly score?: GAScoreInput;
  readonly gate?: QualityGateInput;
  readonly version?: string;
  readonly now?: number;
}

export interface ReleaseReport {
  readonly score: GAScoreReport;
  readonly gate: QualityGateReport;
  readonly checklist: ReleaseChecklistReport;
  readonly readiness: ReadinessReport;
  readonly deployment: DeploymentReadinessReport;
  readonly maturity: MaturityReport;
  readonly certifications: CertificationBundle;
  readonly notes: ReleaseNotes;
  readonly status: ReleaseStatus;
  readonly summary: ReleaseSummary;
}

export function computeRelease(input: ReleaseInput = {}): ReleaseReport {
  const score = computeGAScore(input.score ?? {});
  const gate = evaluateQualityGate(input.gate ?? {});
  const checklist = buildReleaseChecklist(gate, score);
  const readiness = computeReadiness(score, gate);
  const deployment = computeDeploymentReadiness(readiness, checklist);
  const maturity = computeEnterpriseMaturity(score.overall);
  const certifications = issueCertifications(score, gate, readiness);
  const notes = generateReleaseNotes(input.version, input.now);
  const status: ReleaseStatus =
    deployment.deployable && score.grade === 'A+' ? 'GA' :
    deployment.deployable ? 'RC' :
    score.overall >= 65 ? 'BETA' : 'ALPHA';
  const summary = summarizeRelease({ score, gate, readiness, maturity, deployment, status });
  return { score, gate, checklist, readiness, deployment, maturity, certifications, notes, status, summary };
}
