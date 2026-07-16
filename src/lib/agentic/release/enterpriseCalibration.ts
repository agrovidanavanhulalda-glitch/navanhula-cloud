/**
 * Sprint 5.6.1 · Enterprise Calibration — weighted score aggregation.
 */
import { ENTERPRISE_WEIGHTS, EVIDENCE_KEYS, totalWeight } from './enterpriseWeightEngine';
import type { EvidenceReport } from './enterpriseEvidenceEngine';

export interface CalibrationReport {
  readonly enterpriseScore: number;
  readonly gaScore: number;
  readonly productionReadiness: number;
  readonly releaseReadiness: number;
  readonly weightedContributions: Readonly<Record<string, number>>;
}

const avg = (arr: number[]): number =>
  arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

export function calibrate(evidence: EvidenceReport): CalibrationReport {
  const v = evidence.values;
  const t = totalWeight() || 1;
  const contributions = {} as Record<string, number>;
  let weighted = 0;
  for (const k of EVIDENCE_KEYS) {
    const c = (v[k] * ENTERPRISE_WEIGHTS[k]) / t;
    contributions[k] = Math.round(c * 100) / 100;
    weighted += c;
  }
  const enterpriseScore = Math.max(0, Math.min(100, Math.round(weighted)));
  const gaScore = avg([
    v.security, v.testing, v.architecture, v.operations,
    v.compliance, v.governance, v.performance, v.observability,
  ]);
  const productionReadiness = avg([
    v.performance, v.observability, v.operations, v.businessContinuity, v.testing,
  ]);
  const releaseReadiness = avg([
    enterpriseScore, gaScore, productionReadiness, v.release,
  ]);
  return {
    enterpriseScore,
    gaScore,
    productionReadiness,
    releaseReadiness,
    weightedContributions: Object.freeze(contributions),
  };
}
