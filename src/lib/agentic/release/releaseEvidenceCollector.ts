/**
 * Sprint 5.6.3 · Release Evidence Collector — pure aggregator of raw platform signals.
 * No I/O. Consumers inject data.
 */
import type { PlatformSignals } from './gaEvidenceEngine';
import { deriveEvidence } from './gaEvidenceEngine';
import { computeEnterpriseScoreV3, type EnterpriseScoreV3 } from './enterpriseScoreV3';

export interface EvidenceBundle {
  readonly signals: PlatformSignals;
  readonly score: EnterpriseScoreV3;
}

export function collectEvidence(signals: PlatformSignals = {}): EvidenceBundle {
  const score = computeEnterpriseScoreV3(deriveEvidence(signals));
  return { signals, score };
}
