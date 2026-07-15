/**
 * Sprint 4.8 · Governance Score Engine (pure).
 */
export interface GovernanceScoreInput {
  policyScore?: number;
  approvalCoverage?: number;
  auditCoverage?: number;
  knowledgeScore?: number;
  complianceScore?: number;
}

export interface GovernanceScoreResult {
  score: number;
  rating: 'INSUFFICIENT' | 'BASIC' | 'ADEQUATE' | 'STRONG' | 'ENTERPRISE';
  dimensions: Required<GovernanceScoreInput>;
}

const clamp = (n: unknown): number => {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(100, x));
};

export function computeGovernanceScore(input: GovernanceScoreInput = {}): GovernanceScoreResult {
  const dimensions = {
    policyScore: clamp(input.policyScore),
    approvalCoverage: clamp(input.approvalCoverage),
    auditCoverage: clamp(input.auditCoverage),
    knowledgeScore: clamp(input.knowledgeScore),
    complianceScore: clamp(input.complianceScore),
  };
  const vals = Object.values(dimensions);
  const score = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  const rating =
    score >= 90 ? 'ENTERPRISE' :
    score >= 75 ? 'STRONG' :
    score >= 60 ? 'ADEQUATE' :
    score >= 40 ? 'BASIC' : 'INSUFFICIENT';
  return { score, rating, dimensions };
}
