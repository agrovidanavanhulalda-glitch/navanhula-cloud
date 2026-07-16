/**
 * Sprint 5.6.1 · Enterprise Evidence Engine — pure normalization of raw evidence.
 */
import { EVIDENCE_KEYS, type EvidenceKey } from './enterpriseWeightEngine';

export type EvidenceInput = Partial<Record<EvidenceKey, number>>;
export type EvidenceRecord = Readonly<Record<EvidenceKey, number>>;

export interface EvidenceReport {
  readonly values: EvidenceRecord;
  readonly missing: readonly EvidenceKey[];
  readonly criticalCount: number;
  readonly highCount: number;
}

const clamp = (n: unknown): number => {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(100, x));
};

export function normalizeEvidence(input: EvidenceInput = {}): EvidenceReport {
  const values = {} as Record<EvidenceKey, number>;
  const missing: EvidenceKey[] = [];
  for (const k of EVIDENCE_KEYS) {
    const raw = input[k];
    if (raw === undefined || raw === null) missing.push(k);
    values[k] = clamp(raw);
  }
  const criticalCount = Object.values(values).filter((v) => v < 50).length;
  const highCount = Object.values(values).filter((v) => v >= 50 && v < 70).length;
  return { values: Object.freeze(values), missing, criticalCount, highCount };
}
