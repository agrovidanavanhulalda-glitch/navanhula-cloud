import { describe, it, expect } from 'vitest';
import { buildExecutionPlan } from './executionPlanner';
import { buildExecutionGraph } from './executionGraph';
import { buildRollbackPlan } from './rollbackPlanner';
import { estimateExecution } from './executionEstimator';
import { classifyRisk } from './riskPlanner';
import { validateExecution } from './executionValidator';
import { simulateWorkflow } from './workflowSimulator';
import { analyzeDependencies } from './dependencyEngine';
import { summarizeExecution } from './executionSummary';
import { buildPlan, type DetectedProblem } from './plannerEngine';
import { buildTaskBundle } from './taskEngine';

const problem = (over: Partial<DetectedProblem> = {}): DetectedProblem => ({
  id: 'p1',
  kind: 'STORAGE',
  title: 'Storage cheio',
  description: 'test',
  severity: 'HIGH',
  evidence: ['a', 'b'],
  ...over,
});

describe('agentic execution layer', () => {
  it('builds execution plan for a normal storage plan', () => {
    const plan = buildPlan(problem(), 0.9);
    const ex = buildExecutionPlan(plan);
    expect(ex.graph.nodes.length).toBeGreaterThan(2);
    expect(ex.rollback.steps.length).toBeGreaterThan(0);
    expect(['READY', 'REVIEW', 'BLOCKED']).toContain(ex.readiness);
  });

  it('handles empty task bundle', () => {
    const empty = buildTaskBundle('unknown-xyz');
    const dep = analyzeDependencies({ checklist: [], runbook: [], rollback: [], validation: [] });
    expect(dep.nodes).toHaveLength(0);
    expect(dep.cycles).toHaveLength(0);
    const g = buildExecutionGraph({ checklist: [], runbook: [], rollback: [], validation: [] });
    expect(g.nodes).toHaveLength(2);
    expect(empty.runbook.length).toBeGreaterThan(0);
  });

  it('estimator handles NaN/Infinity/null gracefully', () => {
    expect(estimateExecution(null).minMinutes).toBe(0);
    const plan = buildPlan(problem(), 0.5);
    plan.tasks.runbook[0].estimatedMinutes = Number.NaN;
    plan.tasks.runbook[1].estimatedMinutes = Number.POSITIVE_INFINITY as unknown as number;
    const e = estimateExecution(plan);
    expect(Number.isFinite(e.avgMinutes)).toBe(true);
    expect(e.successProbability).toBeGreaterThanOrEqual(5);
    expect(e.successProbability).toBeLessThanOrEqual(99);
  });

  it('risk classifier returns CRITICAL when severity CRITICAL', () => {
    const plan = buildPlan(problem({ severity: 'CRITICAL' }), 0.9);
    plan.score.risk = 90;
    expect(classifyRisk(plan).level).toBe('CRITICAL');
    expect(classifyRisk(null).level).toBe('LOW');
  });

  it('rollback planner reports MISSING on plan without rollback', () => {
    const plan = buildPlan(problem(), 0.9);
    plan.tasks.rollback = [];
    const rb = buildRollbackPlan(plan);
    expect(rb.readiness).toBe('MISSING');
  });

  it('validator flags BLOCK on empty graph or missing rollback', () => {
    const emptyGraph = buildExecutionGraph({ checklist: [], runbook: [], rollback: [], validation: [] });
    const rb = buildRollbackPlan(null);
    const est = estimateExecution(null);
    const v = validateExecution(emptyGraph, rb, est);
    expect(v.ok).toBe(false);
    expect(v.issues.some((i) => i.severity === 'BLOCK')).toBe(true);
  });

  it('simulator produces probability distribution summing ~100', () => {
    const plan = buildPlan(problem(), 0.9);
    const ex = buildExecutionPlan(plan);
    const total = Object.values(ex.simulation.probabilities).reduce((s, v) => s + v, 0);
    expect(total).toBeGreaterThan(90);
    expect(total).toBeLessThan(110);
  });

  it('dependency engine detects duplicates and produces order', () => {
    const plan = buildPlan(problem(), 0.9);
    const dup = { ...plan.tasks.runbook[0], id: `${plan.tasks.runbook[0].id}-dup` };
    plan.tasks.runbook.push(dup);
    const dep = analyzeDependencies(plan.tasks);
    expect(dep.duplicates.length).toBeGreaterThan(0);
    expect(dep.order.length).toBe(dep.nodes.length);
  });

  it('summary returns non-empty headline and next steps', () => {
    const plan = buildPlan(problem(), 0.9);
    const ex = buildExecutionPlan(plan);
    const s = summarizeExecution(ex);
    expect(s.headline.length).toBeGreaterThan(0);
    expect(s.nextSteps.length).toBeGreaterThan(0);
    expect(simulateWorkflow(ex.estimate, ex.validation).timeoutMinutes).toBeGreaterThanOrEqual(0);
  });
});
