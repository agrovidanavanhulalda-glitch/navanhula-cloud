/**
 * Sprint 5.5 · Failure Propagation Engine (pure).
 */
import type { EnterpriseModel } from './enterpriseModelEngine';

export interface PropagationRow {
  dependencyId: string;
  dependencyName: string;
  affectedProcesses: string[];
  revenueImpact: number;
}

export interface FailurePropagation {
  rows: PropagationRow[];
  worstCaseRevenueImpact: number;
}

export function propagateFailure(model: EnterpriseModel): FailurePropagation {
  const rows: PropagationRow[] = model.dependencies.map((d) => {
    const affected = model.processes.filter((p) => p.dependsOn.includes(d.id));
    const revenueImpact = affected.reduce((s, p) => s + p.revenueImpact, 0);
    return {
      dependencyId: d.id,
      dependencyName: d.name,
      affectedProcesses: affected.map((p) => p.name),
      revenueImpact,
    };
  }).sort((a, b) => b.revenueImpact - a.revenueImpact);
  const worst = rows.length ? rows[0].revenueImpact : 0;
  return { rows, worstCaseRevenueImpact: worst };
}
