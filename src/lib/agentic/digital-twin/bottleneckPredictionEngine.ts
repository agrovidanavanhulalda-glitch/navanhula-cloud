/**
 * Sprint 5.5 · Bottleneck Prediction Engine (pure).
 */
import type { EnterpriseModel } from './enterpriseModelEngine';

export interface BottleneckRow {
  id: string;
  name: string;
  pressure: number;
  kind: 'PROCESS' | 'RESOURCE';
}

export interface BottleneckReport {
  rows: BottleneckRow[];
  count: number;
}

export function predictBottlenecks(model: EnterpriseModel): BottleneckReport {
  const rows: BottleneckRow[] = [];
  for (const p of model.processes) {
    const pressure = Math.round((p.load * 0.6) + ((100 - p.health) * 0.4));
    if (pressure >= 60) rows.push({ id: p.id, name: p.name, pressure, kind: 'PROCESS' });
  }
  for (const r of model.resources) {
    const utilization = r.capacity === 0 ? 100 : Math.round((r.used / r.capacity) * 100);
    if (utilization >= 70) rows.push({ id: r.id, name: r.name, pressure: utilization, kind: 'RESOURCE' });
  }
  rows.sort((a, b) => b.pressure - a.pressure);
  return { rows, count: rows.length };
}
