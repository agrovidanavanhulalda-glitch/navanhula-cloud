import type { CustomerEvidence, EvidenceKey } from './types';
import { EVIDENCE_KEYS } from './types';
import { collectCustomerEvidence } from './customerEvidenceCollector';

export type CellState = 'MISSING' | 'CRITICAL' | 'AT_RISK' | 'STABLE' | 'READY';

export interface MatrixCell {
  readonly key: EvidenceKey;
  readonly value: number;
  readonly state: CellState;
}

export interface CertificationMatrix {
  readonly cells: readonly MatrixCell[];
  readonly readyCount: number;
  readonly missingCount: number;
}

export function buildCertificationMatrix(input: CustomerEvidence = {}): CertificationMatrix {
  const collected = collectCustomerEvidence(input);
  const cells: MatrixCell[] = EVIDENCE_KEYS.map((k) => {
    const v = collected.values[k];
    let state: CellState = 'READY';
    if (!collected.present[k]) state = 'MISSING';
    else if (v < 40) state = 'CRITICAL';
    else if (v < 60) state = 'AT_RISK';
    else if (v < 80) state = 'STABLE';
    return { key: k, value: v, state };
  });
  const readyCount = cells.filter((c) => c.state === 'READY').length;
  const missingCount = cells.filter((c) => c.state === 'MISSING').length;
  return { cells, readyCount, missingCount };
}
