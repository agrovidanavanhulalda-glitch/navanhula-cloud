/**
 * Sprint 5.3 · Audit Recommendation Engine (pure).
 */
import type { FindingBreakdown } from './findingEngine';
import type { ControlHealthBreakdown } from './controlFrameworkEngine';

export interface AuditRecommendation {
  readonly id: string;
  readonly message: string;
  readonly weight: number;
}

export function recommendAuditActions(
  findings: FindingBreakdown,
  controls: ControlHealthBreakdown,
): AuditRecommendation[] {
  const recs: AuditRecommendation[] = [];
  if (findings.critical > 0) {
    recs.push({ id: 'critical-findings', message: `Escalate ${findings.critical} critical findings to the audit committee.`, weight: 1.0 });
  }
  if (findings.high > 0) {
    recs.push({ id: 'high-findings', message: `Plan remediation for ${findings.high} high-severity findings within 30 days.`, weight: 0.85 });
  }
  if (controls.failed > 0) {
    recs.push({ id: 'failed-controls', message: `Investigate ${controls.failed} failing internal controls.`, weight: 0.9 });
  }
  if (controls.warning > 0) {
    recs.push({ id: 'warning-controls', message: `Review ${controls.warning} degraded controls before next audit cycle.`, weight: 0.6 });
  }
  if (recs.length === 0) {
    recs.push({ id: 'baseline', message: 'No urgent audit actions. Maintain quarterly control reviews.', weight: 0.2 });
  }
  return recs.sort((a, b) => (b.weight - a.weight) || a.id.localeCompare(b.id));
}
