/**
 * Sprint 5.0 · Capability Maturity Engine (pure).
 * Scale: 0 Initial · 1 Repeatable · 2 Defined · 3 Managed · 4 Optimized · 5 Innovating
 */
import type { Capability } from './businessCapabilityEngine';

export const MATURITY_LEVELS = ['INITIAL', 'REPEATABLE', 'DEFINED', 'MANAGED', 'OPTIMIZED', 'INNOVATING'] as const;
export type MaturityLevel = typeof MATURITY_LEVELS[number];

export interface CapabilityMaturity {
  id: string;
  maturity: number;
  level: MaturityLevel;
}

export interface MaturitySummary {
  total: number;
  avg: number;
  min: number;
  max: number;
  distribution: Record<MaturityLevel, number>;
  items: CapabilityMaturity[];
}

export function evaluateMaturity(list: Capability[]): MaturitySummary {
  const items: CapabilityMaturity[] = list
    .map((c) => ({ id: c.id, maturity: c.maturity, level: MATURITY_LEVELS[Math.min(5, Math.max(0, Math.round(c.maturity)))] }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const dist: Record<MaturityLevel, number> = {
    INITIAL: 0, REPEATABLE: 0, DEFINED: 0, MANAGED: 0, OPTIMIZED: 0, INNOVATING: 0,
  };
  items.forEach((i) => dist[i.level]++);
  const values = items.map((i) => i.maturity);
  const avg = values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : 0;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  return { total: items.length, avg, min, max, distribution: dist, items };
}
