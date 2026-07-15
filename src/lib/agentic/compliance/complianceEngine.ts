/**
 * Sprint 5.3 · Compliance Engine (pure aggregator).
 * Namespaced under agentic/compliance to avoid collision with legacy complianceEngine.
 */
import { evaluateRules, type ComplianceRuleInput, type EvaluatedRule } from './complianceRuleEngine';
import { computeComplianceScore, type ComplianceScore } from './complianceScoreEngine';
import { computeGaps, type ComplianceGap } from './complianceGapEngine';
import {
  evaluateControls,
  summarizeControls,
  type EvaluatedControl,
  type ControlHealthBreakdown,
  type InternalControlInput,
} from './controlFrameworkEngine';
import {
  normalizeFindings,
  summarizeFindings,
  type AuditFindingInput,
  type NormalizedFinding,
  type FindingBreakdown,
} from './findingEngine';
import { recommendRemediations, type RemediationRecommendation } from './remediationEngine';
import { computeTrend, type ComplianceSnapshot, type TrendPoint } from './complianceTrendEngine';
import { forecastCompliance, type ForecastPoint } from './complianceForecastEngine';
import { buildAuditTrail, type AuditTrailInput, type AuditTrailEntry } from './auditTrailEngine';
import { recommendAuditActions, type AuditRecommendation } from './auditRecommendationEngine';
import { buildExecutiveSummary, type ExecutiveComplianceSummary } from './complianceSummaryEngine';

export interface ComplianceIntelligenceInput {
  readonly rules?: readonly ComplianceRuleInput[];
  readonly controls?: readonly InternalControlInput[];
  readonly findings?: readonly AuditFindingInput[];
  readonly snapshots?: readonly ComplianceSnapshot[];
  readonly trail?: readonly AuditTrailInput[];
  readonly now?: number;
}

export interface ComplianceIntelligenceReport {
  readonly score: ComplianceScore;
  readonly evaluatedRules: readonly EvaluatedRule[];
  readonly gaps: readonly ComplianceGap[];
  readonly controls: readonly EvaluatedControl[];
  readonly controlBreakdown: ControlHealthBreakdown;
  readonly findings: readonly NormalizedFinding[];
  readonly findingBreakdown: FindingBreakdown;
  readonly remediations: readonly RemediationRecommendation[];
  readonly trend: readonly TrendPoint[];
  readonly forecast: readonly ForecastPoint[];
  readonly auditTrail: readonly AuditTrailEntry[];
  readonly auditRecommendations: readonly AuditRecommendation[];
  readonly summary: ExecutiveComplianceSummary;
}

export function computeComplianceIntelligence(
  input: ComplianceIntelligenceInput,
): ComplianceIntelligenceReport {
  const now = typeof input.now === 'number' && Number.isFinite(input.now) ? input.now : Date.now();
  const evaluatedRules = evaluateRules(input.rules ?? []);
  const score = computeComplianceScore(evaluatedRules);
  const gaps = computeGaps(evaluatedRules);
  const controls = evaluateControls(input.controls ?? []);
  const controlBreakdown = summarizeControls(controls);
  const findings = normalizeFindings(input.findings ?? []);
  const findingBreakdown = summarizeFindings(findings);
  const remediations = recommendRemediations(gaps, findings);
  const trend = computeTrend(input.snapshots ?? [], now);
  const forecast = forecastCompliance(input.snapshots ?? [], now);
  const auditTrail = buildAuditTrail(input.trail ?? []);
  const auditRecommendations = recommendAuditActions(findingBreakdown, controlBreakdown);
  const summary = buildExecutiveSummary(score, findingBreakdown, controlBreakdown);

  return {
    score,
    evaluatedRules,
    gaps,
    controls,
    controlBreakdown,
    findings,
    findingBreakdown,
    remediations,
    trend,
    forecast,
    auditTrail,
    auditRecommendations,
    summary,
  };
}
