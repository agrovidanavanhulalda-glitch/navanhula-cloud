/**
 * Sprint 5.6.3 · Enterprise Quality Matrix — dimension × score × weight table.
 */
import { ENTERPRISE_WEIGHTS, EVIDENCE_KEYS, type EvidenceKey } from './enterpriseWeightEngine';
import type { EnterpriseScoreV3 } from './enterpriseScoreV3';

export interface QualityMatrixRow {
  readonly key: EvidenceKey;
  readonly score: number;
  readonly weight: number;
  readonly weighted: number;
  readonly status: 'STRONG' | 'OK' | 'WEAK' | 'CRITICAL';
}

export interface QualityMatrixReport {
  readonly rows: readonly QualityMatrixRow[];
  readonly strongCount: number;
  readonly weakCount: number;
  readonly criticalCount: number;
}

const statusFor = (s: number): QualityMatrixRow['status'] =>
  s >= 90 ? 'STRONG' : s >= 75 ? 'OK' : s >= 50 ? 'WEAK' : 'CRITICAL';

export function buildQualityMatrix(score: EnterpriseScoreV3): QualityMatrixReport {
  const rows: QualityMatrixRow[] = EVIDENCE_KEYS.map((k) => {
    const s = score.evidence.values[k];
    const w = ENTERPRISE_WEIGHTS[k];
    return { key: k, score: s, weight: w, weighted: Math.round((s * w) / 100 * 100) / 100, status: statusFor(s) };
  });
  return {
    rows,
    strongCount: rows.filter((r) => r.status === 'STRONG').length,
    weakCount: rows.filter((r) => r.status === 'WEAK').length,
    criticalCount: rows.filter((r) => r.status === 'CRITICAL').length,
  };
}
