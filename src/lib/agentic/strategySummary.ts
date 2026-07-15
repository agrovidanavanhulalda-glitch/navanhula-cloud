/**
 * Sprint 4.7 · Strategy Summary (pure).
 */
import type { StrategyScoreResult } from './strategyScore';
import type { PortfolioView } from './portfolioEngine';
import type { ResourcePlan } from './resourcePlanner';
import type { DependencyGraph } from './dependencyGraph';

export interface StrategySummary {
  headline: string;
  highlights: string[];
  warnings: string[];
  recommendation: string;
}

export function summarizeStrategy(
  score: StrategyScoreResult,
  portfolio: PortfolioView,
  resources: ResourcePlan,
  graph: DependencyGraph,
): StrategySummary {
  const highlights: string[] = [];
  const warnings: string[] = [];

  highlights.push(`Score estratégico ${score.score}/100 (${score.rating}).`);
  highlights.push(`Portfólio: ${portfolio.total} iniciativas · perfil ${portfolio.balance}.`);
  highlights.push(`Prioridades P0/P1: ${portfolio.byBand.P0 + portfolio.byBand.P1}.`);

  if (resources.overloaded) warnings.push(`Capacidade excedida (${resources.utilizationPct}%).`);
  if (graph.hasCycle) warnings.push(`Dependências circulares detectadas (${graph.cycles.length}).`);
  if (portfolio.balance === 'RISKY') warnings.push('Portfólio com risco médio elevado.');
  if (portfolio.balance === 'EMPTY') warnings.push('Nenhuma iniciativa gerada — dados insuficientes.');

  const recommendation =
    score.rating === 'ENTERPRISE' ? 'Encaminhar roadmap para aprovação executiva.'
    : score.rating === 'STRONG' ? 'Revisar iniciativas P0 e submeter para aprovação.'
    : score.rating === 'GOOD' ? 'Refinar iniciativas críticas antes de aprovação.'
    : score.rating === 'LIMITED' ? 'Reagrupar objetivos e reduzir escopo do ciclo.'
    : 'Rever fundamentos estratégicos antes de qualquer aprovação.';

  const headline = `Estratégia ${score.rating} · ${portfolio.total} iniciativas · utilização ${resources.utilizationPct}%.`;
  return { headline, highlights, warnings, recommendation };
}
