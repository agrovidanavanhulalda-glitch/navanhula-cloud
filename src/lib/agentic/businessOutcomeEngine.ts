/**
 * Sprint 5.1 · Business Outcome Engine (pure).
 */
import type { TransformationItem } from './transformationEngine';

export interface BusinessOutcome {
  pillar: string;
  count: number;
  avgProgress: number;
  avgValue: number;
  status: 'BEHIND' | 'PROGRESSING' | 'ACHIEVED';
}

export function evaluateOutcomes(items: TransformationItem[] = []): BusinessOutcome[] {
  const list = Array.isArray(items) ? items : [];
  const groups = new Map<string, TransformationItem[]>();
  list.forEach((i) => {
    const key = i.pillar ?? 'PROCESS';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(i);
  });
  const out: BusinessOutcome[] = [];
  Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([pillar, arr]) => {
      const avgProgress = Math.round(arr.reduce((s, i) => s + i.progress, 0) / arr.length);
      const avgValue = Math.round(arr.reduce((s, i) => s + i.value, 0) / arr.length);
      const status: BusinessOutcome['status'] =
        avgProgress >= 90 ? 'ACHIEVED' : avgProgress >= 40 ? 'PROGRESSING' : 'BEHIND';
      out.push({ pillar, count: arr.length, avgProgress, avgValue, status });
    });
  return out;
}
