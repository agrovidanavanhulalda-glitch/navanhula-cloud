/**
 * Sprint 5.2 · Residual Risk Engine (pure).
 */
import type { NormalizedRisk } from './enterpriseRiskEngine';
import { inherentRisk } from './enterpriseRiskEngine';

export interface ResidualRow {
  id: string;
  name: string;
  before: number;
  after: number;
  delta: number;
}

export interface ResidualReport {
  items: ResidualRow[];
  avgBefore: number;
  avgAfter: number;
  avgDelta: number;
}

export function computeResidual(list: NormalizedRisk[]): ResidualReport {
  const items: ResidualRow[] = list.map((r) => {
    const before = inherentRisk(r);
    const after = Math.max(0, Math.round(before * (1 - r.mitigation / 100)));
    return { id: r.id, name: r.name, before, after, delta: before - after };
  }).sort((a, b) => (b.delta - a.delta) || a.id.localeCompare(b.id));
  if (items.length === 0) return { items, avgBefore: 0, avgAfter: 0, avgDelta: 0 };
  const avgBefore = Math.round(items.reduce((s, i) => s + i.before, 0) / items.length);
  const avgAfter = Math.round(items.reduce((s, i) => s + i.after, 0) / items.length);
  return { items, avgBefore, avgAfter, avgDelta: avgBefore - avgAfter };
}
