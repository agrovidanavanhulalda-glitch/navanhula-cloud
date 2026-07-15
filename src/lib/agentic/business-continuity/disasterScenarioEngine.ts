/**
 * Sprint 5.4 · Disaster Scenario Engine — pure.
 */
import { clamp } from './businessImpactAnalysis';

export interface ScenarioInput {
  id?: unknown;
  name?: unknown;
  likelihood?: unknown; // 0-100
  severity?: unknown;   // 0-100
  detectability?: unknown; // 0-100
}

export interface ScenarioRow {
  id: string;
  name: string;
  likelihood: number;
  severity: number;
  detectability: number;
  risk: number;
}

export interface ScenariosReport {
  rows: ScenarioRow[];
  averageSeverity: number;
  worst: ScenarioRow | null;
}

export function evaluateDisasterScenarios(
  list: readonly ScenarioInput[] | null | undefined,
): ScenariosReport {
  if (!Array.isArray(list) || list.length === 0) {
    return { rows: [], averageSeverity: 0, worst: null };
  }
  const rows: ScenarioRow[] = list
    .filter((s): s is ScenarioInput => s != null && typeof s === 'object')
    .map((s, i) => {
      const id = typeof s.id === 'string' && s.id ? s.id : `S${i + 1}`;
      const name = typeof s.name === 'string' && s.name ? s.name : id;
      const likelihood = clamp(s.likelihood, 0, 100);
      const severity = clamp(s.severity, 0, 100);
      const detectability = clamp(s.detectability, 0, 100);
      const risk = Math.round((likelihood * severity) / 100 * (1 - detectability / 200));
      return { id, name, likelihood, severity, detectability, risk: clamp(risk, 0, 100) };
    })
    .sort((a, b) => (b.risk - a.risk) || a.id.localeCompare(b.id));
  const avg = Math.round(rows.reduce((s, r) => s + r.severity, 0) / rows.length);
  return { rows, averageSeverity: avg, worst: rows[0] ?? null };
}
