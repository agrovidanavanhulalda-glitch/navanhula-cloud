/**
 * Sprint 5.5 · Capacity Mirror Engine (pure).
 */
import type { EnterpriseModel } from './enterpriseModelEngine';
import { mirrorResources } from './resourceMirrorEngine';

export interface CapacityMirror {
  utilization: number;
  headroom: number;
  daysUntilSaturation: number | null;
  rating: 'IDLE' | 'HEALTHY' | 'TIGHT' | 'SATURATED' | 'OVERLOADED';
}

export function mirrorCapacity(model: EnterpriseModel): CapacityMirror {
  const r = mirrorResources(model);
  const utilization = r.averageUtilization;
  const headroom = Math.max(0, 100 - utilization);
  const growth = model.growthPerDay;
  const daysUntilSaturation = growth > 0 && utilization < 100
    ? Math.max(0, Math.round((100 - utilization) / growth))
    : null;
  const rating: CapacityMirror['rating'] =
    utilization >= 100 ? 'OVERLOADED' :
    utilization >= 90 ? 'SATURATED' :
    utilization >= 70 ? 'TIGHT' :
    utilization >= 25 ? 'HEALTHY' : 'IDLE';
  return { utilization, headroom, daysUntilSaturation, rating };
}
