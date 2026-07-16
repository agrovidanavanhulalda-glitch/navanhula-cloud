/**
 * Sprint 5.6.2 · Enterprise Score V3 — evidence-driven, weighted, deterministic.
 */
import { normalizeEvidence, type EvidenceInput } from './enterpriseEvidenceEngine';
import { calibrate, type CalibrationReport } from './enterpriseCalibration';
import type { EvidenceReport } from './enterpriseEvidenceEngine';

export interface EnterpriseScoreV3 {
  readonly evidence: EvidenceReport;
  readonly calibration: CalibrationReport;
  readonly enterpriseScore: number;
  readonly gaScore: number;
  readonly productionReadiness: number;
  readonly releaseReadiness: number;
  readonly minSignal: number;
  readonly maxSignal: number;
  readonly avgSignal: number;
}

export function computeEnterpriseScoreV3(input: EvidenceInput = {}): EnterpriseScoreV3 {
  const evidence = normalizeEvidence(input);
  const calibration = calibrate(evidence);
  const vals = Object.values(evidence.values);
  const minSignal = vals.length ? Math.min(...vals) : 0;
  const maxSignal = vals.length ? Math.max(...vals) : 0;
  const avgSignal = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  return {
    evidence, calibration,
    enterpriseScore: calibration.enterpriseScore,
    gaScore: calibration.gaScore,
    productionReadiness: calibration.productionReadiness,
    releaseReadiness: calibration.releaseReadiness,
    minSignal, maxSignal, avgSignal,
  };
}
