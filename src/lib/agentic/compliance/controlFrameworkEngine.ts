/**
 * Sprint 5.3 · Control Framework Engine (pure).
 */
import type { ControlHealth } from './complianceCatalog';

export interface InternalControlInput {
  readonly id: string;
  readonly name: string;
  readonly failuresLast30d?: number | null;
  readonly totalRunsLast30d?: number | null;
}

export interface EvaluatedControl {
  readonly id: string;
  readonly name: string;
  readonly health: ControlHealth;
  readonly failureRate: number; // 0..1
}

function safe(n: number | null | undefined): number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0;
}

export function evaluateControls(list: readonly InternalControlInput[]): EvaluatedControl[] {
  const src = list ?? [];
  return src
    .filter((c) => c && typeof c.id === 'string')
    .map((c) => {
      const runs = safe(c.totalRunsLast30d);
      const fails = Math.min(safe(c.failuresLast30d), runs);
      const rate = runs > 0 ? fails / runs : 0;
      const health: ControlHealth =
        rate === 0 ? 'HEALTHY' : rate < 0.1 ? 'WARNING' : 'FAILED';
      return { id: c.id, name: c.name, health, failureRate: Math.round(rate * 1000) / 1000 };
    })
    .sort((a, b) => (b.failureRate - a.failureRate) || a.id.localeCompare(b.id));
}

export interface ControlHealthBreakdown {
  readonly healthy: number;
  readonly warning: number;
  readonly failed: number;
  readonly total: number;
}

export function summarizeControls(controls: readonly EvaluatedControl[]): ControlHealthBreakdown {
  const list = controls ?? [];
  let healthy = 0, warning = 0, failed = 0;
  for (const c of list) {
    if (c.health === 'HEALTHY') healthy++;
    else if (c.health === 'WARNING') warning++;
    else failed++;
  }
  return { healthy, warning, failed, total: list.length };
}
