/**
 * Sprint 4.5 · Scenario Engine — build default scenario set from a base plan.
 */
import { normalizeScenario, type ScenarioInput, type ScenarioKind } from './simulationEngine';

export interface BasePlanInput {
  id?: string;
  label?: string;
  risk?: number;
  complexity?: number;
  benefit?: number;
  minutes?: number;
  cost?: number;
  rollbackDifficulty?: number;
  confidence?: number;
}

const val = (n: number | undefined, d: number): number =>
  Number.isFinite(n as number) ? (n as number) : d;

export function buildDefaultScenarios(base: BasePlanInput): ScenarioInput[] {
  const b = {
    risk: val(base.risk, 50),
    complexity: val(base.complexity, 50),
    benefit: val(base.benefit, 50),
    minutes: val(base.minutes, 60),
    cost: val(base.cost, 100),
    rollbackDifficulty: val(base.rollbackDifficulty, 50),
    confidence: val(base.confidence, 60),
  };
  const mk = (kind: ScenarioKind, label: string, mult: {
    risk: number; complexity: number; benefit: number; minutes: number; cost: number; rb: number; conf: number;
  }): ScenarioInput => normalizeScenario({
    id: `${base.id ?? 'plan'}-${kind.toLowerCase()}`,
    kind,
    label,
    risk: b.risk * mult.risk,
    complexity: b.complexity * mult.complexity,
    benefit: b.benefit * mult.benefit,
    minutes: b.minutes * mult.minutes,
    cost: b.cost * mult.cost,
    rollbackDifficulty: b.rollbackDifficulty * mult.rb,
    confidence: b.confidence * mult.conf,
  });
  return [
    mk('CURRENT', base.label ?? 'Plano Atual', { risk: 1, complexity: 1, benefit: 1, minutes: 1, cost: 1, rb: 1, conf: 1 }),
    mk('ALTERNATIVE', 'Plano Alternativo', { risk: 0.9, complexity: 1.1, benefit: 1.05, minutes: 1.1, cost: 1.05, rb: 0.95, conf: 1.02 }),
    mk('CONSERVATIVE', 'Plano Conservador', { risk: 0.6, complexity: 0.8, benefit: 0.8, minutes: 1.3, cost: 0.9, rb: 0.7, conf: 1.1 }),
    mk('AGGRESSIVE', 'Plano Agressivo', { risk: 1.4, complexity: 1.3, benefit: 1.3, minutes: 0.7, cost: 1.2, rb: 1.3, conf: 0.9 }),
  ];
}
