/**
 * Sprint 5.6.3 · Enterprise Release Report — flat consumable report for UIs.
 */
import type { EnterpriseFinalReport } from './enterpriseFinalCertification';

export interface EnterpriseReleaseReport {
  readonly scores: Readonly<Record<string, number>>;
  readonly status: string;
  readonly deployment: string;
  readonly certification: string;
  readonly grade: string;
  readonly maturity: string;
  readonly checklistPassed: number;
  readonly checklistTotal: number;
  readonly gatePassed: number;
  readonly gateTotal: number;
}

export function buildEnterpriseReleaseReport(r: EnterpriseFinalReport): EnterpriseReleaseReport {
  const v = r.evidence.score.evidence.values;
  return {
    scores: Object.freeze({
      enterprise: r.evidence.score.enterpriseScore,
      ga: r.evidence.score.gaScore,
      production: r.evidence.score.productionReadiness,
      release: r.evidence.score.releaseReadiness,
      architecture: v.architecture,
      security: v.security,
      testing: v.testing,
      performance: v.performance,
      recovery: v.businessContinuity,
      governance: v.governance,
      compliance: v.compliance,
      operations: v.operations,
      agentic: v.aiEnterprise,
      digitalTwin: v.digitalTwin,
      businessContinuity: v.businessContinuity,
      transformation: v.transformation,
      strategy: v.strategy,
      observability: v.observability,
      knowledge: v.knowledge,
      decision: v.decision,
      simulation: v.simulation,
    }),
    status: r.decision.status,
    deployment: r.decision.deployment,
    certification: r.certification.label,
    grade: r.certification.grade,
    maturity: r.maturity.level,
    checklistPassed: r.checklist.passedCount,
    checklistTotal: r.checklist.totalCount,
    gatePassed: r.gate.passedCount,
    gateTotal: r.gate.totalCount,
  };
}
