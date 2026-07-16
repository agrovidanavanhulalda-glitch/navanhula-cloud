/**
 * Sprint 5.6.1 · Release Calibration — aggregator (pure).
 */
import { normalizeEvidence, type EvidenceInput, type EvidenceReport } from './enterpriseEvidenceEngine';
import { calibrate, type CalibrationReport } from './enterpriseCalibration';
import { classifyGrade, classifyCertification, type EnterpriseGrade, type CertificationLevel } from './enterpriseGradeEngine';
import { evaluateEnterpriseReadiness, type EnterpriseReadinessReport } from './enterpriseReadinessEngine';
import { analyzeGaps, type GapReport } from './enterpriseGapEngine';
import { buildRecommendations, type Recommendation } from './enterpriseRecommendations';
import { evaluateQualityGate, type QualityGateInput, type QualityGateReport } from './qualityGateEngine';

export interface ReleaseCalibrationInput {
  readonly evidence?: EvidenceInput;
  readonly gate?: QualityGateInput;
}

export interface ReleaseCalibrationReport {
  readonly evidence: EvidenceReport;
  readonly calibration: CalibrationReport;
  readonly readiness: EnterpriseReadinessReport;
  readonly gate: QualityGateReport;
  readonly gaps: GapReport;
  readonly recommendations: readonly Recommendation[];
  readonly grade: EnterpriseGrade;
  readonly certification: CertificationLevel;
}

export function calibrateRelease(input: ReleaseCalibrationInput = {}): ReleaseCalibrationReport {
  const evidence = normalizeEvidence(input.evidence ?? {});
  const calibration = calibrate(evidence);
  const readiness = evaluateEnterpriseReadiness(evidence, calibration);
  const gate = evaluateQualityGate(input.gate ?? {});
  const gaps = analyzeGaps(evidence, readiness);
  const recommendations = buildRecommendations(gaps);
  const grade = classifyGrade(calibration.enterpriseScore);
  const certification = classifyCertification(
    calibration.enterpriseScore,
    readiness.gaEligible && gate.passed,
  );
  return { evidence, calibration, readiness, gate, gaps, recommendations, grade, certification };
}
