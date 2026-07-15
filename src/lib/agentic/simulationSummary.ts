/**
 * Sprint 4.5 · Simulation Summary (pure).
 * Assembles the executive report — no side effects.
 */
import { normalizeScenarios, type ScenarioInput } from './simulationEngine';
import { evaluateAll, buildComparisonMatrix, type ScenarioEvaluation, type ComparisonMatrixRow } from './comparisonEngine';
import { rankScenarios, type ScenarioRanking } from './scenarioRanking';

export interface ExecutiveSummary {
  headline: string;
  motivation: string;
  risks: string[];
  benefits: string[];
  recommendation: string;
  bestScenarioId: string | null;
}

export interface SimulationReport {
  evaluations: ScenarioEvaluation[];
  ranking: ScenarioRanking;
  matrix: ComparisonMatrixRow[];
  summary: ExecutiveSummary;
}

function buildSummary(ranking: ScenarioRanking): ExecutiveSummary {
  const best = ranking.best;
  if (!best) {
    return {
      headline: 'Nenhum cenário disponível para simulação.',
      motivation: 'Forneça pelo menos um plano base para gerar recomendações.',
      risks: [],
      benefits: [],
      recommendation: 'Aguardar dados.',
      bestScenarioId: null,
    };
  }
  const s = best.scenario;
  const risks: string[] = [];
  if (s.risk >= 70) risks.push('Risco elevado — revisar plano de rollback.');
  if (best.probability.rollback >= 60) risks.push('Probabilidade de rollback significativa.');
  if (best.timeline.expectedMinutes > 120) risks.push('Janela de execução longa.');

  const benefits: string[] = [];
  if (s.benefit >= 70) benefits.push('Benefício estimado alto.');
  if (best.impact.overall >= 70) benefits.push('Impacto agregado forte.');
  if (best.probability.success >= 70) benefits.push('Alta probabilidade de sucesso.');

  return {
    headline: `Cenário recomendado: ${s.label} (${best.decision.rating}, score ${best.decision.score}).`,
    motivation: `Combina confiança ${s.confidence} e probabilidade de sucesso ${best.probability.success}.`,
    risks,
    benefits,
    recommendation:
      best.decision.rating === 'OPTIMAL' || best.decision.rating === 'STRONG'
        ? 'Encaminhar para aprovação do Founder.'
        : best.decision.rating === 'GOOD'
        ? 'Refinar plano antes da aprovação.'
        : 'Não recomendado — revisar premissas.',
    bestScenarioId: s.id,
  };
}

export function buildSimulationReport(scenarios: ScenarioInput[]): SimulationReport {
  const evaluations = evaluateAll(normalizeScenarios(scenarios));
  const ranking = rankScenarios(evaluations);
  const matrix = buildComparisonMatrix(evaluations);
  const summary = buildSummary(ranking);
  return { evaluations, ranking, matrix, summary };
}
