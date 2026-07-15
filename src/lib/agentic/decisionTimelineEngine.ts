/**
 * Sprint 4.9 · Decision Timeline Engine (pure).
 */
import type { NormalizedDecision } from './decisionIntelligenceEngine';

export interface TimelineRow {
  id: string;
  estimatedHours: number;
  band: 'IMMEDIATE' | 'SHORT' | 'MEDIUM' | 'LONG';
}

const bandOf = (hours: number): TimelineRow['band'] => {
  if (hours <= 8) return 'IMMEDIATE';
  if (hours <= 40) return 'SHORT';
  if (hours <= 160) return 'MEDIUM';
  return 'LONG';
};

export function estimateTimelines(list: NormalizedDecision[]): TimelineRow[] {
  return list
    .map((d) => {
      const base = d.effortHours > 0 ? d.effortHours : 8 + (d.impact / 100) * 40;
      const riskFactor = 1 + d.risk / 200;
      const hours = Math.round(base * riskFactor);
      return { id: d.id, estimatedHours: hours, band: bandOf(hours) };
    })
    .sort((a, b) => (a.estimatedHours - b.estimatedHours) || a.id.localeCompare(b.id));
}
