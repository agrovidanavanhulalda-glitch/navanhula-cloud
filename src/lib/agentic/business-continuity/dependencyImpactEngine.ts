/**
 * Sprint 5.4 · Dependency Impact Engine — pure.
 */
import { clamp } from './businessImpactAnalysis';

export interface DependencyInput {
  id?: unknown;
  name?: unknown;
  type?: unknown; // INTERNAL | EXTERNAL | INFRASTRUCTURE
  criticality?: unknown; // 0-100
  reliability?: unknown; // 0-100
}

export interface DependencyRow {
  id: string;
  name: string;
  type: 'INTERNAL' | 'EXTERNAL' | 'INFRASTRUCTURE';
  criticality: number;
  reliability: number;
  risk: number;
}

export interface DependencyImpactReport {
  rows: DependencyRow[];
  averageRisk: number;
  highRiskCount: number;
}

function normType(t: unknown): DependencyRow['type'] {
  if (typeof t === 'string') {
    const up = t.toUpperCase();
    if (up === 'INTERNAL' || up === 'EXTERNAL' || up === 'INFRASTRUCTURE') return up;
  }
  return 'INTERNAL';
}

export function computeDependencyImpact(
  list: readonly DependencyInput[] | null | undefined,
): DependencyImpactReport {
  if (!Array.isArray(list) || list.length === 0) {
    return { rows: [], averageRisk: 0, highRiskCount: 0 };
  }
  const rows: DependencyRow[] = list
    .filter((d): d is DependencyInput => d != null && typeof d === 'object')
    .map((d, i) => {
      const id = typeof d.id === 'string' && d.id ? d.id : `D${i + 1}`;
      const name = typeof d.name === 'string' && d.name ? d.name : id;
      const criticality = clamp(d.criticality, 0, 100);
      const reliability = clamp(d.reliability, 0, 100);
      const risk = clamp(criticality * (1 - reliability / 100), 0, 100);
      return { id, name, type: normType(d.type), criticality, reliability, risk: Math.round(risk) };
    })
    .sort((a, b) => (b.risk - a.risk) || a.id.localeCompare(b.id));

  const sum = rows.reduce((s, r) => s + r.risk, 0);
  const averageRisk = rows.length > 0 ? Math.round(sum / rows.length) : 0;
  const highRiskCount = rows.filter((r) => r.risk >= 60).length;
  return { rows, averageRisk, highRiskCount };
}
