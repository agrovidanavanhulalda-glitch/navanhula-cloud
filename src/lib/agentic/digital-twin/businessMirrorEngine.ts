/**
 * Sprint 5.5 · Business Mirror Engine (pure).
 */
import type { EnterpriseModel } from './enterpriseModelEngine';

export interface BusinessMirrorRow {
  id: string;
  name: string;
  criticality: number;
  revenueImpact: number;
  health: number;
  score: number;
}

export interface BusinessMirror {
  rows: BusinessMirrorRow[];
  totalRevenueExposure: number;
  averageHealth: number;
  status: 'HEALTHY' | 'STRESSED' | 'CRITICAL';
}

export function mirrorBusiness(model: EnterpriseModel): BusinessMirror {
  const rows: BusinessMirrorRow[] = model.processes.map((p) => ({
    id: p.id,
    name: p.name,
    criticality: p.criticality,
    revenueImpact: p.revenueImpact,
    health: p.health,
    score: Math.round((p.criticality * 0.4) + (p.revenueImpact * 0.4) + ((100 - p.health) * 0.2)),
  })).sort((a, b) => b.score - a.score);
  const totalRevenueExposure = rows.reduce((s, r) => s + r.revenueImpact * (100 - r.health) / 100, 0);
  const averageHealth = rows.length ? Math.round(rows.reduce((s, r) => s + r.health, 0) / rows.length) : 100;
  const status: BusinessMirror['status'] =
    averageHealth < 40 ? 'CRITICAL' : averageHealth < 70 ? 'STRESSED' : 'HEALTHY';
  return { rows, totalRevenueExposure: Math.round(totalRevenueExposure), averageHealth, status };
}
