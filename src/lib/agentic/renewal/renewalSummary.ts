/**
 * Sprint 7.3 · Renewal Executive Summary.
 */
import type { RenewalAssessment } from './renewalAggregator';

export interface RenewalSummary {
  readonly headline: string;
  readonly highlights: readonly string[];
}

export function summarizeRenewals(assessments: readonly RenewalAssessment[]): RenewalSummary {
  if (assessments.length === 0) {
    return { headline: 'Sem contratos ativos no portfólio.', highlights: [] };
  }
  const total = assessments.length;
  const critical = assessments.filter((a) => a.score.rating === 'CRITICAL').length;
  const champions = assessments.filter((a) => a.score.rating === 'CHAMPION').length;
  const avg = Math.round(
    assessments.reduce((s, a) => s + a.score.score, 0) / total,
  );
  const highlights: string[] = [
    `${champions}/${total} contratos em nível Champion`,
    `${critical} contratos em risco crítico`,
    `Renewal Score médio: ${avg}/100`,
  ];
  const headline =
    critical > total * 0.2
      ? 'Atenção: risco de renovação elevado no portfólio.'
      : champions > total * 0.4
      ? 'Portfólio saudável, alto potencial de expansão.'
      : 'Portfólio estável, executar plano de renovação padrão.';
  return { headline, highlights };
}
