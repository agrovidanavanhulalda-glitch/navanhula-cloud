/**
 * Sprint 4.5 · Simulation Engine (pure, deterministic).
 * Consultive only — no side effects, no execution.
 */

export type ScenarioKind = 'CURRENT' | 'ALTERNATIVE' | 'CONSERVATIVE' | 'AGGRESSIVE';

export interface ScenarioInput {
  id: string;
  kind: ScenarioKind;
  label: string;
  /** 0..100 */
  risk: number;
  /** 0..100 */
  complexity: number;
  /** 0..100 */
  benefit: number;
  /** estimated minutes */
  minutes: number;
  /** estimated cost units */
  cost: number;
  /** 0..100 */
  rollbackDifficulty: number;
  /** 0..100 */
  confidence: number;
}

const clamp = (n: number, lo = 0, hi = 100): number =>
  Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo;

const safe = (n: number, fallback = 0): number => (Number.isFinite(n) ? n : fallback);

export function normalizeScenario(s: ScenarioInput): ScenarioInput {
  return {
    ...s,
    risk: clamp(s.risk),
    complexity: clamp(s.complexity),
    benefit: clamp(s.benefit),
    minutes: Math.max(0, safe(s.minutes)),
    cost: Math.max(0, safe(s.cost)),
    rollbackDifficulty: clamp(s.rollbackDifficulty),
    confidence: clamp(s.confidence),
  };
}

export function normalizeScenarios(list: ScenarioInput[]): ScenarioInput[] {
  return (list ?? []).filter(Boolean).map(normalizeScenario);
}
