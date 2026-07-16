/**
 * Sprint 5.5 · Simulation Replay Engine (pure).
 */
import type { EnterpriseModel } from './enterpriseModelEngine';
import { replayScenario, type ScenarioReplayInput, type ScenarioReplay } from './scenarioReplayEngine';

export interface SimulationReplay {
  runs: ScenarioReplay[];
  criticalCount: number;
  worstOutcome: 'SAFE' | 'DEGRADED' | 'CRITICAL';
}

const rank: Record<ScenarioReplay['outcome'], number> = { SAFE: 0, DEGRADED: 1, CRITICAL: 2 };

export function replaySimulation(scenarios: ScenarioReplayInput[], model: EnterpriseModel): SimulationReplay {
  const runs = (Array.isArray(scenarios) ? scenarios : []).map((s) => replayScenario(model, s));
  const worst = runs.reduce<ScenarioReplay['outcome']>(
    (w, r) => (rank[r.outcome] > rank[w] ? r.outcome : w),
    'SAFE',
  );
  return {
    runs,
    criticalCount: runs.filter((r) => r.outcome === 'CRITICAL').length,
    worstOutcome: worst,
  };
}
