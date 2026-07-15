/**
 * Sprint 4.9 · Decision Consensus Engine (pure).
 * Measures alignment between impact/confidence/urgency and risk inversion.
 */
import type { NormalizedDecision } from './decisionIntelligenceEngine';

export type ConsensusVerdict = 'DIVERGENT' | 'MIXED' | 'ALIGNED' | 'STRONG';

export interface ConsensusRow {
  id: string;
  agreement: number; // 0-100
  verdict: ConsensusVerdict;
}

export function verdictOf(a: number): ConsensusVerdict {
  const x = Math.max(0, Math.min(100, Number.isFinite(a) ? a : 0));
  if (x >= 80) return 'STRONG';
  if (x >= 60) return 'ALIGNED';
  if (x >= 40) return 'MIXED';
  return 'DIVERGENT';
}

export function computeConsensus(list: NormalizedDecision[]): ConsensusRow[] {
  return list
    .map((d) => {
      const signals = [d.impact, d.benefit, d.confidence, d.urgency, 100 - d.risk];
      const mean = signals.reduce((a, b) => a + b, 0) / signals.length;
      const variance =
        signals.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / signals.length;
      const stdev = Math.sqrt(variance);
      // 0 stdev = perfect consensus. Cap at 50.
      const agreement = Math.round(Math.max(0, Math.min(100, 100 - (stdev / 50) * 100)));
      return { id: d.id, agreement, verdict: verdictOf(agreement) };
    })
    .sort((a, b) => (b.agreement - a.agreement) || a.id.localeCompare(b.id));
}
