/**
 * Sprint 5.4 · Service Availability Engine — pure.
 */
import { clamp } from './businessImpactAnalysis';

export interface ServiceInput {
  id?: unknown;
  name?: unknown;
  uptime?: unknown; // 0-100
  slaTarget?: unknown; // 0-100
}

export interface ServiceRow {
  id: string;
  name: string;
  uptime: number;
  slaTarget: number;
  slaBreach: boolean;
}

export interface AvailabilityReport {
  rows: ServiceRow[];
  average: number;
  breachCount: number;
  score: number;
}

export function computeServiceAvailability(
  list: readonly ServiceInput[] | null | undefined,
): AvailabilityReport {
  if (!Array.isArray(list) || list.length === 0) {
    return { rows: [], average: 0, breachCount: 0, score: 0 };
  }
  const rows: ServiceRow[] = list
    .filter((s): s is ServiceInput => s != null && typeof s === 'object')
    .map((s, i) => {
      const id = typeof s.id === 'string' && s.id ? s.id : `SVC${i + 1}`;
      const name = typeof s.name === 'string' && s.name ? s.name : id;
      const uptime = clamp(s.uptime, 0, 100);
      const slaTarget = clamp(s.slaTarget, 0, 100);
      return { id, name, uptime, slaTarget, slaBreach: uptime < slaTarget };
    })
    .sort((a, b) => (a.uptime - b.uptime) || a.id.localeCompare(b.id));
  const avg = rows.reduce((s, r) => s + r.uptime, 0) / rows.length;
  const breachCount = rows.filter((r) => r.slaBreach).length;
  return {
    rows,
    average: Math.round(avg * 100) / 100,
    breachCount,
    score: Math.round(avg),
  };
}
