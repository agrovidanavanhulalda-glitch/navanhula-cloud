/**
 * Sprint 5.5 · Change Impact Engine (pure).
 */
import type { EnterpriseModel } from './enterpriseModelEngine';

export interface ProposedChange {
  id: string;
  name: string;
  affectedProcessIds?: string[];
  loadDelta?: number;
  healthDelta?: number;
}

export interface ChangeImpactRow {
  id: string;
  name: string;
  affected: number;
  revenueExposure: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ChangeImpact {
  rows: ChangeImpactRow[];
  highRiskCount: number;
}

export function projectChangeImpact(changes: ProposedChange[], model: EnterpriseModel): ChangeImpact {
  const rows: ChangeImpactRow[] = (Array.isArray(changes) ? changes : []).map((c) => {
    const ids = new Set((c.affectedProcessIds ?? []).map(String));
    const affected = model.processes.filter((p) => ids.has(p.id));
    const revenueExposure = affected.reduce((s, p) => s + p.revenueImpact, 0);
    const loadDelta = Number.isFinite(c.loadDelta) ? (c.loadDelta as number) : 0;
    const healthDelta = Number.isFinite(c.healthDelta) ? (c.healthDelta as number) : 0;
    const magnitude = Math.abs(loadDelta) + Math.abs(healthDelta) + revenueExposure / 10;
    const risk: ChangeImpactRow['risk'] =
      magnitude >= 60 ? 'HIGH' : magnitude >= 25 ? 'MEDIUM' : 'LOW';
    return {
      id: String(c.id ?? ''),
      name: String(c.name ?? c.id ?? 'change'),
      affected: affected.length,
      revenueExposure,
      risk,
    };
  });
  return { rows, highRiskCount: rows.filter((r) => r.risk === 'HIGH').length };
}
