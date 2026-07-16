/**
 * Sprint 7.1 · Customer Journey Aggregator (pure).
 * Consolidates per-customer journey assessments into a portfolio view.
 */
import type { CustomerRecord } from '../customer-success/customerSuccessAggregator';
import { classifyJourneyStage, type JourneyStage, JOURNEY_STAGES } from './journeyStageEngine';
import { evaluateJourneyScore, type JourneyScore } from './journeyScoreEngine';
import { evaluateMilestones, type MilestoneResult } from './milestoneEngine';
import { evaluateActivation } from './activationEngine';
import { buildJourneyTimeline, type TimelineStep } from './journeyTimelineEngine';
import { summarizeJourney, type JourneySummary } from './journeySummaryEngine';
import { lifecycleOf, type LifecyclePhase } from './customerLifecycleEngine';

export interface CustomerJourneyAssessment {
  readonly id: string;
  readonly name: string;
  readonly planTier: CustomerRecord['planTier'];
  readonly stage: JourneyStage;
  readonly phase: LifecyclePhase;
  readonly score: JourneyScore;
  readonly milestones: MilestoneResult;
  readonly timeline: TimelineStep[];
  readonly summary: JourneySummary;
  readonly activated: boolean;
  readonly tenureDays: number;
}

export interface PortfolioJourney {
  readonly total: number;
  readonly avgJourneyScore: number;
  readonly avgActivation: number;
  readonly avgAdoption: number;
  readonly avgEngagement: number;
  readonly avgRetention: number;
  readonly stageDistribution: Record<JourneyStage | 'AT_RISK', number>;
  readonly phaseDistribution: Record<LifecyclePhase, number>;
  readonly atRiskCustomers: CustomerJourneyAssessment[];
  readonly newlyActivated: CustomerJourneyAssessment[];
  readonly avgDaysToActivation: number;
  readonly customers: CustomerJourneyAssessment[];
}

export function assessJourney(c: CustomerRecord): CustomerJourneyAssessment {
  const stage = classifyJourneyStage(c.signals);
  const score = evaluateJourneyScore(c.signals);
  const milestones = evaluateMilestones(c.signals);
  const activation = evaluateActivation(c.signals);
  const timeline = buildJourneyTimeline(stage);
  const summary = summarizeJourney(stage, score, milestones);
  return {
    id: c.id,
    name: c.name,
    planTier: c.planTier,
    stage,
    phase: summary.phase,
    score,
    milestones,
    timeline,
    summary,
    activated: activation.activated,
    tenureDays: Number.isFinite(c.signals.tenureDays) ? c.signals.tenureDays : 0,
  };
}

const emptyStageDist = (): Record<JourneyStage | 'AT_RISK', number> => {
  const dist = { AT_RISK: 0 } as Record<JourneyStage | 'AT_RISK', number>;
  for (const s of JOURNEY_STAGES) dist[s] = 0;
  return dist;
};

const emptyPhaseDist = (): Record<LifecyclePhase, number> => ({
  ACQUISITION: 0, ACTIVATION: 0, ADOPTION: 0,
  RETENTION: 0, EXPANSION: 0, ADVOCACY: 0, RISK: 0,
});

export function assessJourneyPortfolio(customers: CustomerRecord[]): PortfolioJourney {
  const list = customers.map(assessJourney);
  const total = list.length;

  const stageDistribution = emptyStageDist();
  const phaseDistribution = emptyPhaseDist();

  let sumScore = 0, sumAct = 0, sumAdo = 0, sumEng = 0, sumRet = 0;
  let activatedTenureSum = 0, activatedCount = 0;

  for (const a of list) {
    stageDistribution[a.stage]++;
    phaseDistribution[a.phase]++;
    sumScore += a.score.score;
    sumAct += a.score.activation;
    sumAdo += a.score.adoption;
    sumEng += a.score.engagement;
    sumRet += a.score.retention;
    if (a.activated) {
      activatedTenureSum += a.tenureDays;
      activatedCount++;
    }
  }

  const atRiskCustomers = list.filter((a) => a.stage === 'AT_RISK' || a.phase === 'RISK');
  const newlyActivated = list
    .filter((a) => a.activated && a.tenureDays <= 60)
    .sort((x, y) => x.tenureDays - y.tenureDays)
    .slice(0, 10);

  const avg = (n: number) => (total > 0 ? Math.round(n / total) : 0);

  return {
    total,
    avgJourneyScore: avg(sumScore),
    avgActivation: avg(sumAct),
    avgAdoption: avg(sumAdo),
    avgEngagement: avg(sumEng),
    avgRetention: avg(sumRet),
    stageDistribution,
    phaseDistribution,
    atRiskCustomers,
    newlyActivated,
    avgDaysToActivation: activatedCount > 0 ? Math.round(activatedTenureSum / activatedCount) : 0,
    customers: list,
  };
}
