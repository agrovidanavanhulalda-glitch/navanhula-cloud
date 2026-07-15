/**
 * Sprint 4.9 · Decision Intelligence Engine (pure, consultative).
 * Consolidates existing analytical layers into normalized decision candidates.
 * No side effects. No network. No writes.
 */

export interface DecisionCandidateInput {
  id: string;
  title?: string;
  source?: string;
  impact?: number;        // 0-100
  confidence?: number;    // 0-100
  risk?: number;          // 0-100
  cost?: number;          // 0-100 (higher = more costly)
  urgency?: number;       // 0-100
  benefit?: number;       // 0-100
  effortHours?: number;
  dependencies?: string[];
  tags?: string[];
}

export interface NormalizedDecision {
  id: string;
  title: string;
  source: string;
  impact: number;
  confidence: number;
  risk: number;
  cost: number;
  urgency: number;
  benefit: number;
  effortHours: number;
  dependencies: string[];
  tags: string[];
}

const clamp = (n: unknown, min = 0, max = 100): number => {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(min, Math.min(max, x));
};

const safeStr = (s: unknown, fallback: string): string =>
  typeof s === 'string' && s.length > 0 ? s : fallback;

export function normalizeDecisions(items: DecisionCandidateInput[] = []): NormalizedDecision[] {
  const list = Array.isArray(items) ? items : [];
  return list
    .filter((d) => d && typeof d.id === 'string' && d.id.length > 0)
    .map((d) => ({
      id: d.id,
      title: safeStr(d.title, d.id),
      source: safeStr(d.source, 'unknown'),
      impact: clamp(d.impact),
      confidence: clamp(d.confidence),
      risk: clamp(d.risk),
      cost: clamp(d.cost),
      urgency: clamp(d.urgency),
      benefit: clamp(d.benefit ?? d.impact),
      effortHours: Math.max(
        0,
        typeof d.effortHours === 'number' && Number.isFinite(d.effortHours) ? d.effortHours : 0,
      ),
      dependencies: Array.isArray(d.dependencies) ? d.dependencies.filter((x) => typeof x === 'string') : [],
      tags: Array.isArray(d.tags) ? d.tags.filter((x) => typeof x === 'string') : [],
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
