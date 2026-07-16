import type { CustomerEvidence, EvidenceKey } from './types';
import { EVIDENCE_KEYS } from './types';
import { clamp } from './_utils';

export interface CollectedEvidence {
  readonly values: Readonly<Record<EvidenceKey, number>>;
  readonly present: Readonly<Record<EvidenceKey, boolean>>;
  readonly presentCount: number;
  readonly totalCount: number;
  readonly completeness: number;
}

export function collectCustomerEvidence(input: CustomerEvidence = {}): CollectedEvidence {
  const values = {} as Record<EvidenceKey, number>;
  const present = {} as Record<EvidenceKey, boolean>;
  let presentCount = 0;
  for (const k of EVIDENCE_KEYS) {
    const raw = input[k];
    const isPresent = typeof raw === 'number' && Number.isFinite(raw);
    present[k] = isPresent;
    values[k] = clamp(raw);
    if (isPresent) presentCount++;
  }
  const totalCount = EVIDENCE_KEYS.length;
  const completeness = Math.round((presentCount / totalCount) * 100);
  return { values, present, presentCount, totalCount, completeness };
}
