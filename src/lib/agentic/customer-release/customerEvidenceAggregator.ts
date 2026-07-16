import type { CustomerEvidence } from './types';
import { collectCustomerEvidence, type CollectedEvidence } from './customerEvidenceCollector';
import { EVIDENCE_KEYS } from './types';
import { round } from './_utils';

export interface AggregatedEvidence {
  readonly collected: CollectedEvidence;
  readonly overall: number;
  readonly weighted: number;
}

const WEIGHTS: Record<string, number> = {
  customerSuccessScore: 0.2,
  customerHealthScore: 0.15,
  journeyScore: 0.15,
  feedbackScore: 0.1,
  supportScore: 0.15,
  renewalScore: 0.15,
  customer360Score: 0.1,
};

export function aggregateCustomerEvidence(input: CustomerEvidence = {}): AggregatedEvidence {
  const collected = collectCustomerEvidence(input);
  const sum = EVIDENCE_KEYS.reduce((s, k) => s + collected.values[k], 0);
  const overall = round(sum / EVIDENCE_KEYS.length);
  const weighted = round(
    EVIDENCE_KEYS.reduce((s, k) => s + collected.values[k] * (WEIGHTS[k] ?? 0), 0),
  );
  return { collected, overall, weighted };
}
