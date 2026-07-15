/**
 * Sprint 5.4 · Failover Planner — pure.
 */
import { clamp } from './businessImpactAnalysis';

export interface FailoverInput {
  id?: unknown;
  name?: unknown;
  configured?: unknown;   // boolean
  tested?: unknown;       // boolean
  automatic?: unknown;    // boolean
  failoverTimeMinutes?: unknown; // >=0
}

export interface FailoverRow {
  id: string;
  name: string;
  configured: boolean;
  tested: boolean;
  automatic: boolean;
  failoverTimeMinutes: number;
  readiness: number; // 0-100
}

export interface FailoverReport {
  rows: FailoverRow[];
  score: number;
  untestedCount: number;
}

export function planFailover(
  list: readonly FailoverInput[] | null | undefined,
): FailoverReport {
  if (!Array.isArray(list) || list.length === 0) {
    return { rows: [], score: 0, untestedCount: 0 };
  }
  const rows: FailoverRow[] = list
    .filter((f): f is FailoverInput => f != null && typeof f === 'object')
    .map((f, i) => {
      const id = typeof f.id === 'string' && f.id ? f.id : `F${i + 1}`;
      const name = typeof f.name === 'string' && f.name ? f.name : id;
      const configured = f.configured === true;
      const tested = f.tested === true;
      const automatic = f.automatic === true;
      const time = clamp(f.failoverTimeMinutes, 0, 1440);
      let readiness = 0;
      if (configured) readiness += 40;
      if (tested) readiness += 30;
      if (automatic) readiness += 20;
      readiness += Math.round((1 - time / 1440) * 10);
      readiness = Math.max(0, Math.min(100, readiness));
      return { id, name, configured, tested, automatic, failoverTimeMinutes: time, readiness };
    })
    .sort((a, b) => (b.readiness - a.readiness) || a.id.localeCompare(b.id));
  const score = Math.round(rows.reduce((s, r) => s + r.readiness, 0) / rows.length);
  const untestedCount = rows.filter((r) => !r.tested).length;
  return { rows, score, untestedCount };
}
