/**
 * Sprint 5.5 · Digital Twin Summary (pure).
 */
import type { DigitalTwinScore } from './digitalTwinScore';
import type { HealthProjection } from './healthProjectionEngine';
import type { BottleneckReport } from './bottleneckPredictionEngine';
import type { FailurePropagation } from './failurePropagationEngine';
import type { CapacityMirror } from './capacityMirrorEngine';

export interface DigitalTwinSummaryInput {
  score: DigitalTwinScore;
  health: HealthProjection;
  bottlenecks: BottleneckReport;
  failure: FailurePropagation;
  capacity: CapacityMirror;
}

export interface DigitalTwinSummaryReport {
  headline: string;
  bullets: string[];
}

export function summarizeDigitalTwin(i: DigitalTwinSummaryInput): DigitalTwinSummaryReport {
  const bullets: string[] = [];
  bullets.push(`Saúde atual ${i.health.now}/100 · tendência ${i.health.trend.toLowerCase()}`);
  bullets.push(`Capacidade ${i.capacity.utilization}% utilizada (${i.capacity.rating})`);
  bullets.push(`${i.bottlenecks.count} gargalo(s) previsto(s)`);
  bullets.push(`Pior propagação: ${i.failure.worstCaseRevenueImpact} pts de exposição`);
  return {
    headline: `Digital Twin ${i.score.status} · ${i.score.total}/100 (${i.score.grade})`,
    bullets,
  };
}
