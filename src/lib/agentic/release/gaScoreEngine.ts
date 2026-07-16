/**
 * Sprint 5.6 · GA Score Engine — pure, deterministic, read-only.
 */
export interface GAScoreInput {
  architecture?: number;
  security?: number;
  performance?: number;
  observability?: number;
  compliance?: number;
  governance?: number;
  continuity?: number;
  digitalTwin?: number;
  aiEnterprise?: number;
  operations?: number;
  transformation?: number;
  risk?: number;
  decision?: number;
  knowledge?: number;
  simulation?: number;
  strategy?: number;
  policy?: number;
  capability?: number;
  executiveAnalytics?: number;
  testing?: number;
  recovery?: number;
}

export type GAGrade = 'A+' | 'A' | 'B' | 'C';

export interface GAScoreReport {
  readonly dimensions: Required<GAScoreInput>;
  readonly overall: number;
  readonly enterpriseScore: number;
  readonly productionScore: number;
  readonly operationalScore: number;
  readonly securityScore: number;
  readonly architectureScore: number;
  readonly recoveryScore: number;
  readonly complianceScore: number;
  readonly testingScore: number;
  readonly grade: GAGrade;
}

const clamp = (n: unknown): number => {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(100, x));
};

const avg = (arr: number[]): number =>
  arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

export function computeGAScore(input: GAScoreInput = {}): GAScoreReport {
  const d: Required<GAScoreInput> = {
    architecture: clamp(input.architecture),
    security: clamp(input.security),
    performance: clamp(input.performance),
    observability: clamp(input.observability),
    compliance: clamp(input.compliance),
    governance: clamp(input.governance),
    continuity: clamp(input.continuity),
    digitalTwin: clamp(input.digitalTwin),
    aiEnterprise: clamp(input.aiEnterprise),
    operations: clamp(input.operations),
    transformation: clamp(input.transformation),
    risk: clamp(input.risk),
    decision: clamp(input.decision),
    knowledge: clamp(input.knowledge),
    simulation: clamp(input.simulation),
    strategy: clamp(input.strategy),
    policy: clamp(input.policy),
    capability: clamp(input.capability),
    executiveAnalytics: clamp(input.executiveAnalytics),
    testing: clamp(input.testing),
    recovery: clamp(input.recovery),
  };
  const overall = avg(Object.values(d));
  const enterpriseScore = avg([d.architecture, d.governance, d.strategy, d.capability, d.executiveAnalytics]);
  const productionScore = avg([d.performance, d.observability, d.operations, d.testing]);
  const operationalScore = avg([d.operations, d.observability, d.performance]);
  const securityScore = avg([d.security, d.compliance, d.risk]);
  const architectureScore = avg([d.architecture, d.capability, d.digitalTwin]);
  const recoveryScore = avg([d.continuity, d.recovery]);
  const complianceScore = avg([d.compliance, d.governance, d.policy]);
  const testingScore = d.testing;
  const grade: GAGrade =
    overall >= 92 ? 'A+' :
    overall >= 82 ? 'A' :
    overall >= 70 ? 'B' : 'C';
  return {
    dimensions: d, overall, enterpriseScore, productionScore, operationalScore,
    securityScore, architectureScore, recoveryScore, complianceScore, testingScore, grade,
  };
}
