/**
 * Sprint 5.6.4 · Quality Gate Matrix — per-domain PASS / WARN / FAIL classification.
 */
import { EVIDENCE_KEYS, ENTERPRISE_WEIGHTS, type EvidenceKey } from './enterpriseWeightEngine';
import type { AggregatedEvidence } from './evidenceAggregatorFinal';

export type MatrixVerdict = 'PASS' | 'WARN' | 'FAIL';

export interface MatrixRow {
  readonly key: EvidenceKey;
  readonly value: number;
  readonly weight: number;
  readonly verdict: MatrixVerdict;
}

export interface QualityGateMatrixReport {
  readonly rows: readonly MatrixRow[];
  readonly passCount: number;
  readonly warnCount: number;
  readonly failCount: number;
  readonly total: number;
  readonly passRatio: number;
}

const verdictFor = (v: number): MatrixVerdict => (v >= 90 ? 'PASS' : v >= 75 ? 'WARN' : 'FAIL');

export function buildQualityGateMatrix(agg: AggregatedEvidence): QualityGateMatrixReport {
  const rows: MatrixRow[] = EVIDENCE_KEYS.map((k) => ({
    key: k,
    value: agg.domains[k],
    weight: ENTERPRISE_WEIGHTS[k],
    verdict: verdictFor(agg.domains[k]),
  }));
  const passCount = rows.filter((r) => r.verdict === 'PASS').length;
  const warnCount = rows.filter((r) => r.verdict === 'WARN').length;
  const failCount = rows.filter((r) => r.verdict === 'FAIL').length;
  const total = rows.length;
  const passRatio = total ? Math.round((passCount / total) * 100) : 0;
  return { rows, passCount, warnCount, failCount, total, passRatio };
}
