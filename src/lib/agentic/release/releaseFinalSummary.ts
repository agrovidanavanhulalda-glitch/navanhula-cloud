/**
 * Sprint 5.6.3 · Release Final Summary — executive narrative.
 */
import type { EnterpriseFinalReport } from './enterpriseFinalCertification';

export interface ReleaseFinalSummary {
  readonly headline: string;
  readonly bullets: readonly string[];
  readonly verdict: 'GO' | 'CONDITIONAL_GO';
}

export function summarizeFinal(r: EnterpriseFinalReport): ReleaseFinalSummary {
  const { evidence, decision, certification, checklist, gate, maturity } = r;
  const bullets: string[] = [
    `Enterprise ${evidence.score.enterpriseScore} · GA ${evidence.score.gaScore} · Production ${evidence.score.productionReadiness}.`,
    `Checklist GA: ${checklist.passedCount}/${checklist.totalCount}.`,
    `Quality Gate: ${gate.passedCount}/${gate.totalCount}.`,
    `Maturity: ${maturity.level} (${maturity.pointsToNext} pts para ${maturity.nextLevel ?? 'topo'}).`,
    `Certification: ${certification.label} · Grade ${certification.grade}.`,
  ];
  const headline = decision.status === 'GA_CERTIFIED'
    ? `🏆 ENTERPRISE GENERAL AVAILABILITY · STATUS: GA CERTIFIED · Deployment: GO.`
    : `Enterprise Release Candidate · STATUS: RC · Deployment: CONDITIONAL GO.`;
  return { headline, bullets, verdict: decision.deployment };
}
