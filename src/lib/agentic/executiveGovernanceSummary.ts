/**
 * Sprint 4.8 · Executive Governance Summary (pure).
 */
import type { PortfolioHealthReport } from './portfolioHealthEngine';
import type { GovernanceScoreResult } from './governanceScoreEngine';
import type { AlignmentResult } from './strategicAlignmentEngine';
import type { InvestmentReport } from './investmentEngine';
import type { RiskExposureReport } from './riskExposureEngine';
import type { CapacityReport } from './portfolioCapacityEngine';

export interface ExecutiveGovernanceInput {
  health: PortfolioHealthReport;
  governance: GovernanceScoreResult;
  alignment: AlignmentResult;
  investment: InvestmentReport;
  risk: RiskExposureReport;
  capacity: CapacityReport;
}

export interface ExecutiveGovernanceSummary {
  overallScore: number;
  verdict: 'BLOCKED' | 'REVIEW' | 'READY' | 'EXEMPLARY';
  headline: string;
  bullets: string[];
}

export function summarizeExecutiveGovernance(input: ExecutiveGovernanceInput): ExecutiveGovernanceSummary {
  const overallScore = Math.round(
    input.health.score * 0.2 +
    input.governance.score * 0.25 +
    input.alignment.score * 0.2 +
    Math.max(0, Math.min(100, 50 + input.investment.roi / 4)) * 0.15 +
    (100 - input.risk.exposure) * 0.1 +
    (100 - input.capacity.saturationRisk) * 0.1,
  );
  const verdict: ExecutiveGovernanceSummary['verdict'] =
    input.risk.rating === 'EXTREME' || input.capacity.rating === 'OVERLOADED' ? 'BLOCKED' :
    overallScore >= 85 ? 'EXEMPLARY' :
    overallScore >= 70 ? 'READY' : 'REVIEW';
  const headline =
    verdict === 'BLOCKED' ? 'Portfólio bloqueado: risco ou capacidade críticos.' :
    verdict === 'EXEMPLARY' ? 'Portfólio Enterprise em estado exemplar.' :
    verdict === 'READY' ? 'Portfólio pronto para execução.' : 'Portfólio requer revisão executiva.';
  const bullets = [
    `Health ${input.health.rating} (${input.health.score})`,
    `Governance ${input.governance.rating} (${input.governance.score})`,
    `Alignment ${input.alignment.score}% • cobertura ${input.alignment.coverage}%`,
    `Investment ${input.investment.rating} • ROI ${input.investment.roi}%`,
    `Risk ${input.risk.rating} (${input.risk.exposure})`,
    `Capacity ${input.capacity.rating} • utilização ${input.capacity.utilization}%`,
  ];
  return { overallScore, verdict, headline, bullets };
}
