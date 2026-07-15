/**
 * Sprint 4.9 · Decision Confidence Engine (pure).
 */
import type { NormalizedDecision } from './decisionIntelligenceEngine';

export type ConfidenceLevel = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export interface ConfidenceRow {
  id: string;
  confidence: number;
  level: ConfidenceLevel;
}

export function levelOf(c: number): ConfidenceLevel {
  const x = Math.max(0, Math.min(100, Number.isFinite(c) ? c : 0));
  if (x >= 85) return 'VERY_HIGH';
  if (x >= 70) return 'HIGH';
  if (x >= 50) return 'MEDIUM';
  if (x >= 30) return 'LOW';
  return 'VERY_LOW';
}

export function evaluateConfidence(list: NormalizedDecision[]): ConfidenceRow[] {
  return list
    .map((d) => ({ id: d.id, confidence: Math.round(d.confidence), level: levelOf(d.confidence) }))
    .sort((a, b) => (b.confidence - a.confidence) || a.id.localeCompare(b.id));
}
