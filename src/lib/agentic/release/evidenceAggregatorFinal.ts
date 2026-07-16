/**
 * Sprint 5.6.4 · Evidence Aggregator Final — pure, centralizes real evidence.
 * No hardcoded scores. Consumers inject raw PlatformSignals only.
 */
import { deriveEvidence, type PlatformSignals } from './gaEvidenceEngine';
import { computeEnterpriseScoreV3, type EnterpriseScoreV3 } from './enterpriseScoreV3';
import { EVIDENCE_KEYS, type EvidenceKey } from './enterpriseWeightEngine';

export interface AggregatedEvidence {
  readonly signals: PlatformSignals;
  readonly score: EnterpriseScoreV3;
  readonly domains: Readonly<Record<EvidenceKey, number>>;
  readonly presentCount: number;
  readonly totalCount: number;
  readonly completeness: number;
}

export function aggregateEvidence(signals: PlatformSignals = {}): AggregatedEvidence {
  const score = computeEnterpriseScoreV3(deriveEvidence(signals));
  const domains = score.evidence.values;
  const totalCount = EVIDENCE_KEYS.length;
  const presentCount = EVIDENCE_KEYS.filter((k) => domains[k] > 0).length;
  const completeness = Math.round((presentCount / totalCount) * 100);
  return { signals, score, domains, presentCount, totalCount, completeness };
}
