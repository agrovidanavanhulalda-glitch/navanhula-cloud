/**
 * Sprint 4.4 · Pattern Engine (pure, deterministic).
 * Detects recurring patterns across historical decisions.
 */
import type { DecisionRecord } from './decisionMemory';
import { groupDecisions } from './memoryEngine';

export type PatternKind =
  | 'RECURRING_PLAN'
  | 'FREQUENT_APPROVAL'
  | 'FREQUENT_REJECTION'
  | 'RECURRING_FAILURE'
  | 'BOTTLENECK'
  | 'FREQUENT_CHANGE';

export interface DetectedPattern {
  kind: PatternKind;
  key: string;
  title: string;
  count: number;
  ratio: number;
  detail: string;
}

export function detectPatterns(decisions: DecisionRecord[] = []): DetectedPattern[] {
  const groups = groupDecisions(decisions);
  const patterns: DetectedPattern[] = [];
  for (const g of groups) {
    if (g.size >= 3) {
      patterns.push({
        kind: 'RECURRING_PLAN',
        key: g.key,
        title: g.title,
        count: g.size,
        ratio: 1,
        detail: `${g.size} ocorrências semelhantes`,
      });
    }
    const total = g.size || 1;
    if (g.approved / total >= 0.7 && g.size >= 2) {
      patterns.push({
        kind: 'FREQUENT_APPROVAL',
        key: g.key,
        title: g.title,
        count: g.approved,
        ratio: g.approved / total,
        detail: `${Math.round((g.approved / total) * 100)}% aprovados`,
      });
    }
    if (g.rejected / total >= 0.5 && g.size >= 2) {
      patterns.push({
        kind: 'FREQUENT_REJECTION',
        key: g.key,
        title: g.title,
        count: g.rejected,
        ratio: g.rejected / total,
        detail: `${Math.round((g.rejected / total) * 100)}% rejeitados`,
      });
    }
    if ((g.expired + g.cancelled) / total >= 0.4 && g.size >= 2) {
      patterns.push({
        kind: 'RECURRING_FAILURE',
        key: g.key,
        title: g.title,
        count: g.expired + g.cancelled,
        ratio: (g.expired + g.cancelled) / total,
        detail: `Alta taxa de cancelamento/expiração`,
      });
    }
    if (g.avgDurationMs > 24 * 3600_000 && g.pending > 0) {
      patterns.push({
        kind: 'BOTTLENECK',
        key: g.key,
        title: g.title,
        count: g.pending,
        ratio: g.pending / total,
        detail: `Tempo médio > 24h com ${g.pending} pendentes`,
      });
    }
  }
  return patterns.sort((a, b) => b.count - a.count).slice(0, 50);
}
