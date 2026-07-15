/**
 * Sprint 4.5 · Impact Engine — deterministic multi-dimensional impact.
 */
import type { ScenarioInput } from './simulationEngine';

export interface ImpactBreakdown {
  operational: number;
  financial: number;
  technical: number;
  organizational: number;
  scalability: number;
  governance: number;
  overall: number;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

export function estimateImpact(s: ScenarioInput): ImpactBreakdown {
  const operational = clamp(s.benefit * 0.6 + s.complexity * 0.2);
  const financial = clamp(s.benefit * 0.5 + (100 - Math.min(100, s.cost / 10)) * 0.3);
  const technical = clamp(s.complexity * 0.7 + s.risk * 0.2);
  const organizational = clamp(s.benefit * 0.4 + s.confidence * 0.3);
  const scalability = clamp(s.benefit * 0.5 + (100 - s.complexity) * 0.3);
  const governance = clamp(s.confidence * 0.5 + (100 - s.risk) * 0.4);
  const overall = clamp(
    (operational + financial + technical + organizational + scalability + governance) / 6,
  );
  return { operational, financial, technical, organizational, scalability, governance, overall };
}
