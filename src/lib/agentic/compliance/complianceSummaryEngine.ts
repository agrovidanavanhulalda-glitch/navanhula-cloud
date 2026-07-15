/**
 * Sprint 5.3 · Compliance Summary Engine (pure).
 */
import type { ComplianceScore } from './complianceScoreEngine';
import type { FindingBreakdown } from './findingEngine';
import type { ControlHealthBreakdown } from './controlFrameworkEngine';

export interface ExecutiveComplianceSummary {
  readonly headline: string;
  readonly grade: 'A' | 'B' | 'C' | 'D' | 'F';
  readonly bullets: readonly string[];
}

function grade(score: number): ExecutiveComplianceSummary['grade'] {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export function buildExecutiveSummary(
  score: ComplianceScore,
  findings: FindingBreakdown,
  controls: ControlHealthBreakdown,
): ExecutiveComplianceSummary {
  const g = grade(score.score);
  const bullets: string[] = [
    `Compliance score: ${score.score}/100 (${score.status}).`,
    `Rules — Compliant ${score.compliant} · Partial ${score.partial} · Non-Compliant ${score.nonCompliant}.`,
    `Findings — Critical ${findings.critical} · High ${findings.high} · Medium ${findings.medium} · Low ${findings.low}. Open: ${findings.open}.`,
    `Internal controls — Healthy ${controls.healthy} · Warning ${controls.warning} · Failed ${controls.failed}.`,
  ];
  const headline =
    g === 'A' ? 'Enterprise compliance posture is strong.'
    : g === 'B' ? 'Compliance posture is solid with minor gaps.'
    : g === 'C' ? 'Moderate gaps require executive attention.'
    : g === 'D' ? 'Significant compliance gaps need remediation.'
    : 'Critical compliance exposure — immediate action required.';
  return { headline, grade: g, bullets };
}
