/**
 * Sprint 5.4 · Business Continuity Engine — pure, deterministic, read-only.
 *
 * Aggregates BCM inputs and produces an integrated intelligence report.
 * All sub-engines are pure functions; no I/O, timers, storage, or side effects.
 */
import { analyzeBusinessImpact, type BIARow, type ProcessInput } from './businessImpactAnalysis';
import { rankCriticalProcesses } from './criticalProcessEngine';
import { computeDependencyImpact, type DependencyInput } from './dependencyImpactEngine';
import { computeRecoveryObjectives } from './recoveryObjectiveEngine';
import { buildContinuityPlan } from './continuityPlanner';
import { evaluateDisasterScenarios, type ScenarioInput } from './disasterScenarioEngine';
import { simulateRecovery } from './recoverySimulationEngine';
import { computeServiceAvailability, type ServiceInput } from './serviceAvailabilityEngine';
import { planFailover, type FailoverInput } from './failoverPlanner';
import { computeResilience } from './resiliencePlanner';
import { validateBackups, type BackupInput } from './backupValidationEngine';
import { computeRecoveryReadiness } from './recoveryReadinessEngine';
import { computeContinuityScore } from './continuityScoreEngine';
import { summarizeContinuity, type ContinuitySummary } from './continuitySummaryEngine';

export interface BCMInput {
  now?: number;
  processes?: readonly ProcessInput[];
  dependencies?: readonly DependencyInput[];
  services?: readonly ServiceInput[];
  scenarios?: readonly ScenarioInput[];
  failovers?: readonly FailoverInput[];
  backups?: readonly BackupInput[];
}

export interface BCMReport {
  bia: BIARow[];
  critical: BIARow[];
  dependencies: ReturnType<typeof computeDependencyImpact>;
  objectives: ReturnType<typeof computeRecoveryObjectives>;
  plan: ReturnType<typeof buildContinuityPlan>;
  scenarios: ReturnType<typeof evaluateDisasterScenarios>;
  simulation: ReturnType<typeof simulateRecovery>;
  availability: ReturnType<typeof computeServiceAvailability>;
  failover: ReturnType<typeof planFailover>;
  resilience: ReturnType<typeof computeResilience>;
  backups: ReturnType<typeof validateBackups>;
  readiness: ReturnType<typeof computeRecoveryReadiness>;
  score: ReturnType<typeof computeContinuityScore>;
  summary: ContinuitySummary;
}

export function computeBusinessContinuity(input: BCMInput = {}): BCMReport {
  const bia = analyzeBusinessImpact(input.processes ?? []);
  const critical = rankCriticalProcesses(bia);
  const dependencies = computeDependencyImpact(input.dependencies ?? []);
  const objectives = computeRecoveryObjectives(bia);
  const plan = buildContinuityPlan(bia, dependencies);
  const scenarios = evaluateDisasterScenarios(input.scenarios ?? []);
  const simulation = simulateRecovery(bia, scenarios);
  const availability = computeServiceAvailability(input.services ?? []);
  const failover = planFailover(input.failovers ?? []);
  const resilience = computeResilience(availability, failover);
  const backups = validateBackups(input.backups ?? []);
  const readiness = computeRecoveryReadiness(objectives, backups, failover);
  const score = computeContinuityScore({
    readiness: readiness.score,
    resilience: resilience.score,
    availability: availability.score,
    backups: backups.score,
    scenarios: scenarios.averageSeverity,
  });
  const summary = summarizeContinuity({
    score,
    readiness,
    resilience,
    availability,
    backups,
    failover,
    critical,
    scenarios,
  });
  return {
    bia, critical, dependencies, objectives, plan, scenarios, simulation,
    availability, failover, resilience, backups, readiness, score, summary,
  };
}
