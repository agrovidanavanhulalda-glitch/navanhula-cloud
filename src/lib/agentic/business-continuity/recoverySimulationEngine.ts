/**
 * Sprint 5.4 · Recovery Simulation Engine — pure.
 * Estimates recovery time and residual impact for scenarios.
 */
import type { BIARow } from './businessImpactAnalysis';
import type { ScenariosReport } from './disasterScenarioEngine';

export interface RecoverySimulationRow {
  scenarioId: string;
  scenarioName: string;
  estimatedRecoveryHours: number;
  residualImpact: number;
}

export interface RecoverySimulationReport {
  rows: RecoverySimulationRow[];
  worstCaseHours: number;
}

export function simulateRecovery(
  bia: BIARow[],
  scenarios: ScenariosReport,
): RecoverySimulationReport {
  if (scenarios.rows.length === 0) return { rows: [], worstCaseHours: 0 };
  const criticality = bia.length > 0
    ? bia.reduce((s, r) => s + r.impactScore, 0) / bia.length
    : 50;
  const rows: RecoverySimulationRow[] = scenarios.rows.map((s) => {
    const base = 1 + (s.severity / 100) * 48;
    const factor = 1 + criticality / 200;
    const hours = Math.round(base * factor * 100) / 100;
    const residual = Math.max(0, Math.min(100, Math.round(s.severity * (1 - s.detectability / 200))));
    return {
      scenarioId: s.id,
      scenarioName: s.name,
      estimatedRecoveryHours: hours,
      residualImpact: residual,
    };
  });
  const worst = rows.reduce((m, r) => Math.max(m, r.estimatedRecoveryHours), 0);
  return { rows, worstCaseHours: worst };
}
