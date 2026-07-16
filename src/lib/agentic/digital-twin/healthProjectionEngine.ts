/**
 * Sprint 5.5 · Health Projection Engine (pure).
 */
import type { EnterpriseModel } from './enterpriseModelEngine';

export interface HealthProjection {
  now: number;
  d7: number;
  d30: number;
  d90: number;
  trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
}

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

export function projectHealth(model: EnterpriseModel): HealthProjection {
  const now = model.processes.length
    ? Math.round(model.processes.reduce((s, p) => s + p.health, 0) / model.processes.length)
    : 100;
  const g = model.growthPerDay * 0.2;
  const d7 = clamp(now - g * 7);
  const d30 = clamp(now - g * 30);
  const d90 = clamp(now - g * 90);
  const trend: HealthProjection['trend'] =
    d30 < now - 5 ? 'DEGRADING' :
    d30 > now + 5 ? 'IMPROVING' : 'STABLE';
  return { now, d7, d30, d90, trend };
}
