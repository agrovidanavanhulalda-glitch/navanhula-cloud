/**
 * Sprint 5.5 · Digital Twin Score (pure).
 */
import type { HealthProjection } from './healthProjectionEngine';
import type { CapacityMirror } from './capacityMirrorEngine';
import type { ResourceMirror } from './resourceMirrorEngine';
import type { BottleneckReport } from './bottleneckPredictionEngine';
import type { FailurePropagation } from './failurePropagationEngine';
import type { DependencyMap } from './dependencyMapEngine';

export interface DigitalTwinScoreInput {
  health: HealthProjection;
  capacity: CapacityMirror;
  resources: ResourceMirror;
  bottlenecks: BottleneckReport;
  failure: FailurePropagation;
  dependencies: DependencyMap;
}

export interface DigitalTwinScore {
  total: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  breakdown: {
    health: number;
    capacity: number;
    bottlenecks: number;
    dependencies: number;
  };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

export function scoreDigitalTwin(i: DigitalTwinScoreInput): DigitalTwinScore {
  const health = clamp(i.health.now);
  const capacity = clamp(100 - i.capacity.utilization);
  const bottlenecks = clamp(100 - Math.min(100, i.bottlenecks.count * 10));
  const depPenalty = Math.min(100, i.dependencies.highRiskCount * 12);
  const dependencies = clamp(100 - depPenalty);
  const total = Math.round(health * 0.35 + capacity * 0.25 + bottlenecks * 0.2 + dependencies * 0.2);
  const grade: DigitalTwinScore['grade'] =
    total >= 90 ? 'A' : total >= 75 ? 'B' : total >= 60 ? 'C' : total >= 40 ? 'D' : 'F';
  const status: DigitalTwinScore['status'] =
    total >= 90 ? 'EXCELLENT' : total >= 75 ? 'GOOD' : total >= 60 ? 'FAIR' : total >= 40 ? 'POOR' : 'CRITICAL';
  return { total, grade, status, breakdown: { health, capacity, bottlenecks, dependencies } };
}
