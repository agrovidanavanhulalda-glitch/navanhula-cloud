/**
 * Sprint 5.5 · Enterprise Digital Twin Engine (pure, read-only).
 * Composes all sub-engines into a single deterministic report.
 */
import { buildEnterpriseModel, type EnterpriseModel, type EnterpriseModelInput } from './enterpriseModelEngine';
import { projectState, type StateProjection } from './stateProjectionEngine';
import { replayScenario, type ScenarioReplay, type ScenarioReplayInput } from './scenarioReplayEngine';
import { mirrorBusiness, type BusinessMirror } from './businessMirrorEngine';
import { mapDependencies, type DependencyMap } from './dependencyMapEngine';
import { mirrorResources, type ResourceMirror } from './resourceMirrorEngine';
import { mirrorCapacity, type CapacityMirror } from './capacityMirrorEngine';
import { predictBottlenecks, type BottleneckReport } from './bottleneckPredictionEngine';
import { propagateFailure, type FailurePropagation } from './failurePropagationEngine';
import { projectHealth, type HealthProjection } from './healthProjectionEngine';
import { replayTimeline, type TimelineReplay, type TimelineEvent } from './timelineReplayEngine';
import { replaySimulation, type SimulationReplay } from './simulationReplayEngine';
import { projectChangeImpact, type ChangeImpact, type ProposedChange } from './changeImpactEngine';
import { scoreDigitalTwin, type DigitalTwinScore } from './digitalTwinScore';
import { summarizeDigitalTwin, type DigitalTwinSummaryReport } from './digitalTwinSummary';

export interface DigitalTwinInput extends EnterpriseModelInput {
  timeline?: TimelineEvent[];
  scenarios?: ScenarioReplayInput[];
  proposedChanges?: ProposedChange[];
}

export interface DigitalTwinReport {
  model: EnterpriseModel;
  currentState: StateProjection;
  projectedState: StateProjection;
  businessMirror: BusinessMirror;
  resources: ResourceMirror;
  capacity: CapacityMirror;
  dependencies: DependencyMap;
  bottlenecks: BottleneckReport;
  failure: FailurePropagation;
  health: HealthProjection;
  timeline: TimelineReplay;
  scenarios: SimulationReplay;
  changeImpact: ChangeImpact;
  score: DigitalTwinScore;
  summary: DigitalTwinSummaryReport;
}

export function computeDigitalTwin(input: DigitalTwinInput = {}): DigitalTwinReport {
  const model = buildEnterpriseModel(input);
  const currentState = projectState(model, 0);
  const projectedState = projectState(model, 30);
  const businessMirror = mirrorBusiness(model);
  const resources = mirrorResources(model);
  const capacity = mirrorCapacity(model);
  const dependencies = mapDependencies(model);
  const bottlenecks = predictBottlenecks(model);
  const failure = propagateFailure(model);
  const health = projectHealth(model);
  const timeline = replayTimeline(input.timeline ?? []);
  const scenarios = replaySimulation(input.scenarios ?? [], model);
  const changeImpact = projectChangeImpact(input.proposedChanges ?? [], model);
  const score = scoreDigitalTwin({ health, capacity, resources, bottlenecks, failure, dependencies });
  const summary = summarizeDigitalTwin({ score, health, bottlenecks, failure, capacity });
  return {
    model, currentState, projectedState, businessMirror,
    resources, capacity, dependencies, bottlenecks, failure,
    health, timeline, scenarios, changeImpact, score, summary,
  };
}
