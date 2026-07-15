/**
 * Sprint 4.7 · Resource Planner (pure).
 */
import type { Initiative } from './initiativeEngine';

export interface ResourcePlan {
  totalEffort: number;
  capacity: number;             // 0-100 (percent)
  utilizationPct: number;       // 0-∞ capped at 200 for display
  overloaded: boolean;
  slotsAvailable: number;       // discrete initiative slots per cycle
  scheduled: string[];          // initiative ids that fit in this cycle
  deferred: string[];           // ids deferred to next cycle
}

const CYCLE_EFFORT_UNITS = 40; // arbitrary enterprise sprint capacity (unitless)

export function planResources(initiatives: Initiative[], capacityPct: number): ResourcePlan {
  const capacity = Math.max(0, Math.min(100, Number.isFinite(capacityPct) ? capacityPct : 100));
  const totalEffort = initiatives.reduce((s, i) => s + Math.max(0, Math.min(10, i.effort)), 0);
  const availableUnits = Math.round(CYCLE_EFFORT_UNITS * (capacity / 100));
  let used = 0;
  const scheduled: string[] = [];
  const deferred: string[] = [];
  // Deterministic order: by effort asc, then id
  const ordered = [...initiatives].sort((a, b) => (a.effort - b.effort) || a.id.localeCompare(b.id));
  for (const i of ordered) {
    if (used + i.effort <= availableUnits) {
      scheduled.push(i.id);
      used += i.effort;
    } else {
      deferred.push(i.id);
    }
  }
  const utilizationPct = availableUnits === 0
    ? (totalEffort > 0 ? 200 : 0)
    : Math.min(200, Math.round((totalEffort / availableUnits) * 100));

  return {
    totalEffort,
    capacity,
    utilizationPct,
    overloaded: totalEffort > availableUnits,
    slotsAvailable: Math.max(0, availableUnits - used),
    scheduled,
    deferred,
  };
}
