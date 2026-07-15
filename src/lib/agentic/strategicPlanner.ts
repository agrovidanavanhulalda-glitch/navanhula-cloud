/**
 * Sprint 4.7 · Strategic Planner (pure orchestrator).
 * Aggregates all strategy engines into a single advisory report.
 * ADVISORY ONLY — no side effects.
 */
import { buildObjectives, type StrategicObjective } from './objectiveEngine';
import { buildInitiatives, type Initiative } from './initiativeEngine';
import { buildOKRs, type OKR } from './okrEngine';
import { rankPriorities, type PriorityItem } from './priorityMatrix';
import { buildDependencyGraph, type DependencyGraph } from './dependencyGraph';
import { planResources, type ResourcePlan } from './resourcePlanner';
import { buildRoadmap, type RoadmapItem } from './roadmapEngine';
import { buildMilestones, type Milestone } from './milestoneEngine';
import { buildPortfolio, type PortfolioView } from './portfolioEngine';
import { computeStrategyScore, type StrategyScoreResult } from './strategyScore';
import { summarizeStrategy, type StrategySummary } from './strategySummary';

export interface StrategicInput {
  opsHealth?: number;             // 0-100
  enterpriseScore?: number;       // 0-100
  storageUsagePct?: number;       // 0-100
  approvalsPending?: number;
  approvalsApproved?: number;
  approvalsRejected?: number;
  knowledgeScore?: number;        // 0-100
  policyScore?: number;           // 0-100
  simulationScore?: number;       // 0-100
  executionReadiness?: number;    // 0-100
  activeInitiatives?: number;
  teamCapacity?: number;          // 0-100
}

export interface StrategicReport {
  objectives: StrategicObjective[];
  initiatives: Initiative[];
  okrs: OKR[];
  priorities: PriorityItem[];
  graph: DependencyGraph;
  resources: ResourcePlan;
  roadmap: RoadmapItem[];
  milestones: Milestone[];
  portfolio: PortfolioView;
  score: StrategyScoreResult;
  summary: StrategySummary;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'READY';
}

const clamp = (n: unknown): number => {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(100, x));
};

export function buildStrategicReport(raw: StrategicInput = {}): StrategicReport {
  const input: Required<StrategicInput> = {
    opsHealth: clamp(raw.opsHealth),
    enterpriseScore: clamp(raw.enterpriseScore),
    storageUsagePct: clamp(raw.storageUsagePct),
    approvalsPending: Math.max(0, Number.isFinite(raw.approvalsPending as number) ? (raw.approvalsPending as number) : 0),
    approvalsApproved: Math.max(0, Number.isFinite(raw.approvalsApproved as number) ? (raw.approvalsApproved as number) : 0),
    approvalsRejected: Math.max(0, Number.isFinite(raw.approvalsRejected as number) ? (raw.approvalsRejected as number) : 0),
    knowledgeScore: clamp(raw.knowledgeScore),
    policyScore: clamp(raw.policyScore),
    simulationScore: clamp(raw.simulationScore),
    executionReadiness: clamp(raw.executionReadiness),
    activeInitiatives: Math.max(0, Number.isFinite(raw.activeInitiatives as number) ? (raw.activeInitiatives as number) : 0),
    teamCapacity: clamp(raw.teamCapacity ?? 100),
  };

  const objectives = buildObjectives(input);
  const initiatives = buildInitiatives(objectives, input);
  const okrs = buildOKRs(objectives);
  const priorities = rankPriorities(initiatives);
  const graph = buildDependencyGraph(initiatives);
  const resources = planResources(initiatives, input.teamCapacity);
  const roadmap = buildRoadmap(priorities, resources);
  const milestones = buildMilestones(roadmap);
  const portfolio = buildPortfolio(initiatives, priorities);
  const score = computeStrategyScore(input, priorities, resources, graph);
  const summary = summarizeStrategy(score, portfolio, resources, graph);

  return {
    objectives, initiatives, okrs, priorities, graph, resources,
    roadmap, milestones, portfolio, score, summary,
    status: 'DRAFT',
  };
}
