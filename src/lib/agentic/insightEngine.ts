/**
 * Sprint 4.4 · Insight Engine (pure).
 * Ranks top insights from memory + patterns.
 */
import type { DecisionRecord } from './decisionMemory';
import type { DetectedPattern } from './patternEngine';
import { groupDecisions, type MemoryGroup } from './memoryEngine';

export interface TopInsights {
  topPatterns: DetectedPattern[];
  topRisks: MemoryGroup[];
  topSuccesses: MemoryGroup[];
  topBottlenecks: MemoryGroup[];
  topWorkflows: MemoryGroup[];
  topDecisions: DecisionRecord[];
}

export function computeInsights(
  decisions: DecisionRecord[] = [],
  patterns: DetectedPattern[] = [],
): TopInsights {
  const groups = groupDecisions(decisions);
  return {
    topPatterns: patterns.slice(0, 10),
    topRisks: [...groups].sort((a, b) => b.avgRisk - a.avgRisk).slice(0, 10),
    topSuccesses: [...groups].sort((a, b) => b.approved - a.approved).slice(0, 10),
    topBottlenecks: [...groups]
      .filter((g) => g.pending > 0)
      .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
      .slice(0, 10),
    topWorkflows: [...groups].sort((a, b) => b.size - a.size).slice(0, 10),
    topDecisions: [...decisions]
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, 10),
  };
}
