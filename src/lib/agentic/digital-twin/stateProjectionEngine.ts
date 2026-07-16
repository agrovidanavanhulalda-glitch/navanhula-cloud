/**
 * Sprint 5.5 · State Projection Engine (pure).
 */
import type { EnterpriseModel } from './enterpriseModelEngine';

export interface StateProjection {
  horizonDays: number;
  averageLoad: number;
  averageHealth: number;
  saturatedResources: number;
  totalResources: number;
  status: 'STABLE' | 'DEGRADING' | 'AT_RISK' | 'CRITICAL';
}

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

export function projectState(model: EnterpriseModel, horizonDays = 0): StateProjection {
  const days = Math.max(0, Number.isFinite(horizonDays) ? horizonDays : 0);
  const growth = model.growthPerDay * days;
  const loads = model.processes.map((p) => clamp(p.load + growth));
  const healths = model.processes.map((p) => clamp(p.health - growth * 0.2));
  const resourceUsage = model.resources.map((r) => clamp(r.used + growth));
  const averageLoad = loads.length ? Math.round(loads.reduce((a, b) => a + b, 0) / loads.length) : 0;
  const averageHealth = healths.length ? Math.round(healths.reduce((a, b) => a + b, 0) / healths.length) : 100;
  const saturated = resourceUsage.filter((u) => u >= 85).length;
  const status: StateProjection['status'] =
    averageHealth < 40 || saturated >= Math.max(1, Math.floor(model.resources.length / 2)) ? 'CRITICAL' :
    averageHealth < 65 || averageLoad > 85 ? 'AT_RISK' :
    averageLoad > 65 ? 'DEGRADING' : 'STABLE';
  return {
    horizonDays: days,
    averageLoad,
    averageHealth,
    saturatedResources: saturated,
    totalResources: model.resources.length,
    status,
  };
}
