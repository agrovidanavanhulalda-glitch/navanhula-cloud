/**
 * Sprint 5.5 · Scenario Replay Engine (pure).
 */
import type { EnterpriseModel } from './enterpriseModelEngine';

export interface ScenarioReplayInput {
  id: string;
  name: string;
  loadDelta?: number;    // -100..+100
  healthDelta?: number;  // -100..+100
  failedDependencies?: string[];
}

export interface ScenarioReplay {
  id: string;
  name: string;
  averageLoad: number;
  averageHealth: number;
  failedDependencies: number;
  outcome: 'SAFE' | 'DEGRADED' | 'CRITICAL';
}

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

export function replayScenario(model: EnterpriseModel, s: ScenarioReplayInput): ScenarioReplay {
  const loadDelta = Number.isFinite(s.loadDelta) ? (s.loadDelta as number) : 0;
  const healthDelta = Number.isFinite(s.healthDelta) ? (s.healthDelta as number) : 0;
  const failedIds = new Set((s.failedDependencies ?? []).map(String));
  const failedDependencies = model.dependencies.filter((d) => failedIds.has(d.id)).length;
  const loads = model.processes.map((p) => clamp(p.load + loadDelta));
  const healths = model.processes.map((p) => clamp(p.health + healthDelta - failedDependencies * 5));
  const averageLoad = loads.length ? Math.round(loads.reduce((a, b) => a + b, 0) / loads.length) : 0;
  const averageHealth = healths.length ? Math.round(healths.reduce((a, b) => a + b, 0) / healths.length) : 100;
  const outcome: ScenarioReplay['outcome'] =
    averageHealth < 40 || averageLoad > 90 ? 'CRITICAL' :
    averageHealth < 70 || averageLoad > 75 ? 'DEGRADED' : 'SAFE';
  return {
    id: String(s.id ?? ''),
    name: String(s.name ?? s.id ?? 'scenario'),
    averageLoad, averageHealth, failedDependencies, outcome,
  };
}
