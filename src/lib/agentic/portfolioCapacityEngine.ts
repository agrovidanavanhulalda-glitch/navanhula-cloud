/**
 * Sprint 4.8 · Portfolio Capacity Engine (pure).
 */
export interface CapacityInput {
  totalCapacity?: number;   // 0-100
  usedCapacity?: number;    // 0-100
  activeInitiatives?: number;
  deferredInitiatives?: number;
}

export interface CapacityReport {
  utilization: number;      // %
  headroom: number;         // %
  overloaded: boolean;
  saturationRisk: number;   // 0-100
  rating: 'IDLE' | 'HEALTHY' | 'TIGHT' | 'SATURATED' | 'OVERLOADED';
}

const clamp = (n: unknown, min: number, max: number): number => {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(min, Math.min(max, x));
};

export function evaluateCapacity(input: CapacityInput = {}): CapacityReport {
  const total = clamp(input.totalCapacity ?? 100, 0, 100);
  const used = clamp(input.usedCapacity, 0, 100);
  const deferred = Math.max(0, Number.isFinite(input.deferredInitiatives as number) ? (input.deferredInitiatives as number) : 0);
  const utilization = total === 0 ? 100 : Math.round((used / total) * 100);
  const headroom = Math.max(0, 100 - utilization);
  const overloaded = utilization > 100 || deferred > 0;
  const saturationRisk = Math.min(100, utilization + deferred * 5);
  const rating: CapacityReport['rating'] =
    overloaded || saturationRisk >= 100 ? 'OVERLOADED' :
    saturationRisk >= 85 ? 'SATURATED' :
    saturationRisk >= 65 ? 'TIGHT' :
    saturationRisk >= 30 ? 'HEALTHY' : 'IDLE';
  return { utilization, headroom, overloaded, saturationRisk, rating };
}
