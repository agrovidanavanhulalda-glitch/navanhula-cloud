/**
 * Sprint 4.8 · Governance Dashboard Engine (pure orchestrator).
 * Aggregates all Sprint 4.8 engines into a single advisory report.
 */
import { evaluatePortfolioHealth, type PortfolioHealthReport } from './portfolioHealthEngine';
import { computeGovernanceScore, type GovernanceScoreResult } from './governanceScoreEngine';
import { evaluateAlignment, type AlignmentInitiative, type AlignmentResult } from './strategicAlignmentEngine';
import { analyzeInvestment, type InvestmentItem, type InvestmentReport } from './investmentEngine';
import { evaluateBenefits, type BenefitItem, type BenefitRealizationReport } from './benefitRealizationEngine';
import { computeRiskExposure, type RiskItem, type RiskExposureReport } from './riskExposureEngine';
import { rankInitiatives, type RankableInitiative, type RankedInitiative } from './initiativeRankingEngine';
import { evaluateCapacity, type CapacityReport } from './portfolioCapacityEngine';
import { summarizeExecutiveGovernance, type ExecutiveGovernanceSummary } from './executiveGovernanceSummary';

export interface GovernanceDashboardInput {
  opsHealth?: number;
  executionReadiness?: number;
  policyScore?: number;
  approvalCoverage?: number;
  auditCoverage?: number;
  knowledgeScore?: number;
  complianceScore?: number;
  totalCapacity?: number;
  usedCapacity?: number;
  initiatives?: RankableInitiative[];
  objectiveIds?: string[];
  investments?: InvestmentItem[];
  benefits?: BenefitItem[];
  risks?: RiskItem[];
}

export interface HeatCell {
  id: string;
  label: string;
  value: number;
  severity: 'low' | 'medium' | 'high';
}

export interface GovernanceDashboardReport {
  health: PortfolioHealthReport;
  governance: GovernanceScoreResult;
  alignment: AlignmentResult;
  investment: InvestmentReport;
  benefits: BenefitRealizationReport;
  risk: RiskExposureReport;
  capacity: CapacityReport;
  ranking: RankedInitiative[];
  heatmap: HeatCell[];
  radar: { axis: string; value: number }[];
  summary: ExecutiveGovernanceSummary;
}

const sev = (v: number): 'low' | 'medium' | 'high' =>
  v >= 70 ? 'low' : v >= 40 ? 'medium' : 'high';

export function buildGovernanceDashboard(input: GovernanceDashboardInput = {}): GovernanceDashboardReport {
  const initiatives = Array.isArray(input.initiatives) ? input.initiatives : [];
  const ranking = rankInitiatives(initiatives);
  const activeInitiatives = ranking.length;
  const deferredInitiatives = 0;

  const health = evaluatePortfolioHealth({
    activeInitiatives,
    deferredInitiatives,
    opsHealth: input.opsHealth,
    executionReadiness: input.executionReadiness,
  });
  const governance = computeGovernanceScore({
    policyScore: input.policyScore,
    approvalCoverage: input.approvalCoverage,
    auditCoverage: input.auditCoverage,
    knowledgeScore: input.knowledgeScore,
    complianceScore: input.complianceScore,
  });
  const alignment = evaluateAlignment(
    initiatives.map(i => ({
      id: i.id,
      objectiveId: (i as any).objectiveId ?? '_orphan',
      impact: (i.impact ?? 0),
      confidence: (i.confidence ?? 0),
    })),
    input.objectiveIds ?? [],
  );
  const investment = analyzeInvestment(input.investments ?? []);
  const benefits = evaluateBenefits(input.benefits ?? []);
  const risk = computeRiskExposure(input.risks ?? []);
  const capacity = evaluateCapacity({
    totalCapacity: input.totalCapacity,
    usedCapacity: input.usedCapacity,
    activeInitiatives,
    deferredInitiatives,
  });

  const heatmap: HeatCell[] = [
    { id: 'health', label: 'Health', value: health.score, severity: sev(health.score) },
    { id: 'governance', label: 'Governance', value: governance.score, severity: sev(governance.score) },
    { id: 'alignment', label: 'Alignment', value: alignment.score, severity: sev(alignment.score) },
    { id: 'benefits', label: 'Benefits', value: Math.min(100, benefits.realizationRate), severity: sev(Math.min(100, benefits.realizationRate)) },
    { id: 'risk', label: 'Risk (inv.)', value: 100 - risk.exposure, severity: sev(100 - risk.exposure) },
    { id: 'capacity', label: 'Capacity', value: 100 - capacity.saturationRisk, severity: sev(100 - capacity.saturationRisk) },
  ];

  const radar = heatmap.map(h => ({ axis: h.label, value: h.value }));

  const summary = summarizeExecutiveGovernance({
    health, governance, alignment, investment, risk, capacity,
  });

  return { health, governance, alignment, investment, benefits, risk, capacity, ranking, heatmap, radar, summary };
}
