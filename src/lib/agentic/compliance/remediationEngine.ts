/**
 * Sprint 5.3 · Remediation Engine (pure).
 */
import type { ComplianceGap } from './complianceGapEngine';
import type { NormalizedFinding } from './findingEngine';

export type Priority = 'P1' | 'P2' | 'P3';

export interface RemediationRecommendation {
  readonly id: string;
  readonly title: string;
  readonly priority: Priority;
  readonly impact: number; // 0..1
  readonly effort: number; // 0..1
  readonly rationale: string;
}

const PRIORITY_RANK: Record<Priority, number> = { P1: 3, P2: 2, P3: 1 };

export function recommendRemediations(
  gaps: readonly ComplianceGap[],
  findings: readonly NormalizedFinding[],
): RemediationRecommendation[] {
  const recs: RemediationRecommendation[] = [];

  for (const g of gaps ?? []) {
    const priority: Priority = g.gap >= 0.7 ? 'P1' : g.gap >= 0.4 ? 'P2' : 'P3';
    recs.push({
      id: `gap-${g.id}`,
      title: `Close compliance gap: ${g.name}`,
      priority,
      impact: g.gap,
      effort: Math.round((0.3 + g.gap * 0.5) * 1000) / 1000,
      rationale: `Framework ${g.frameworkId} gap of ${(g.gap * 100).toFixed(0)}%.`,
    });
  }

  for (const f of findings ?? []) {
    if (!f.open) continue;
    const priority: Priority =
      f.severity === 'CRITICAL' ? 'P1' : f.severity === 'HIGH' ? 'P1' : f.severity === 'MEDIUM' ? 'P2' : 'P3';
    const impact = f.severity === 'CRITICAL' ? 1 : f.severity === 'HIGH' ? 0.8 : f.severity === 'MEDIUM' ? 0.5 : 0.2;
    recs.push({
      id: `finding-${f.id}`,
      title: `Resolve ${f.severity.toLowerCase()} finding: ${f.title}`,
      priority,
      impact,
      effort: 0.4,
      rationale: `Open ${f.severity} audit finding.`,
    });
  }

  return recs.sort((a, b) => {
    const pd = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (pd !== 0) return pd;
    const id = b.impact - a.impact;
    if (id !== 0) return id;
    return a.id.localeCompare(b.id);
  });
}
