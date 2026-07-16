/**
 * Sprint 5.6 · Readiness Engine — pure.
 */
import type { GAScoreReport } from './gaScoreEngine';
import type { QualityGateReport } from './qualityGateEngine';

export type ReadinessLevel = 'NOT_READY' | 'CONDITIONAL' | 'READY' | 'FULLY_READY';

export interface ReadinessReport {
  readonly productionReadiness: number;
  readonly gaReadiness: number;
  readonly enterpriseReadiness: number;
  readonly level: ReadinessLevel;
}

export function computeReadiness(score: GAScoreReport, gate: QualityGateReport): ReadinessReport {
  const productionReadiness = Math.round(
    (score.productionScore * 0.5) + (score.operationalScore * 0.3) + (gate.score * 0.2),
  );
  const gaReadiness = Math.round((score.overall * 0.7) + (gate.score * 0.3));
  const enterpriseReadiness = Math.round(
    (score.enterpriseScore * 0.4) + (score.overall * 0.4) + (gate.score * 0.2),
  );
  const level: ReadinessLevel =
    gaReadiness >= 92 && gate.passed ? 'FULLY_READY' :
    gaReadiness >= 82 && gate.passed ? 'READY' :
    gaReadiness >= 70 ? 'CONDITIONAL' : 'NOT_READY';
  return { productionReadiness, gaReadiness, enterpriseReadiness, level };
}
