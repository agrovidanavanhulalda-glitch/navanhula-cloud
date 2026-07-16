/**
 * Sprint 5.6.1 · Enterprise Gap Engine — strengths, weaknesses, remaining gaps.
 */
import { EVIDENCE_KEYS, type EvidenceKey } from './enterpriseWeightEngine';
import type { EvidenceReport } from './enterpriseEvidenceEngine';
import type { EnterpriseReadinessReport } from './enterpriseReadinessEngine';

export interface GapItem {
  readonly key: EvidenceKey;
  readonly value: number;
  readonly gap: number;
}

export interface GapReport {
  readonly strengths: readonly GapItem[];
  readonly weaknesses: readonly GapItem[];
  readonly remainingGaps: readonly { id: string; label: string; gap: number }[];
}

export function analyzeGaps(
  evidence: EvidenceReport,
  readiness: EnterpriseReadinessReport,
): GapReport {
  const items: GapItem[] = EVIDENCE_KEYS.map((k) => ({
    key: k, value: evidence.values[k], gap: Math.max(0, 92 - evidence.values[k]),
  }));
  const strengths = [...items].filter((i) => i.value >= 85).sort((a, b) => b.value - a.value).slice(0, 5);
  const weaknesses = [...items].filter((i) => i.value < 75).sort((a, b) => a.value - b.value).slice(0, 5);
  const remainingGaps = readiness.criteria
    .filter((c) => !c.passed)
    .map((c) => ({ id: c.id, label: c.label, gap: Math.max(0, c.threshold - c.value) }));
  return { strengths, weaknesses, remainingGaps };
}
