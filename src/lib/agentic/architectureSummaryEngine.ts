/**
 * Sprint 5.0 · Architecture Summary Engine (pure).
 */
import type { ArchitectureReport } from './enterpriseArchitectureEngine';

export interface ArchitectureSummary {
  generatedAt: string;
  headline: string;
  score: number;
  rating: string;
  totals: {
    capabilities: number;
    domains: number;
    boundedContexts: number;
    criticalRisks: number;
    bottlenecks: number;
    cycles: number;
  };
  highlights: string[];
}

export function buildArchitectureSummary(report: ArchitectureReport): ArchitectureSummary {
  const criticalRisks = report.risks.filter((r) => r.level === 'CRITICAL').length;
  const bottlenecks = report.dependencies.bottlenecks.length;
  const cycles = report.dependencies.cycles.length;
  const highlights: string[] = [];
  highlights.push(`${report.capabilities.length} capabilities · ${report.domains.length} domínios · ${report.boundedContexts.length} contextos`);
  if (criticalRisks > 0) highlights.push(`${criticalRisks} risco(s) crítico(s)`);
  if (bottlenecks > 0) highlights.push(`${bottlenecks} gargalo(s) arquitetural(is)`);
  if (cycles > 0) highlights.push(`${cycles} ciclo(s) de dependência`);
  highlights.push(`Score ${report.score.score} · ${report.score.rating}`);
  return {
    generatedAt: new Date(0).toISOString(),
    headline: `Enterprise Architecture · ${report.score.rating}`,
    score: report.score.score,
    rating: report.score.rating,
    totals: {
      capabilities: report.capabilities.length,
      domains: report.domains.length,
      boundedContexts: report.boundedContexts.length,
      criticalRisks,
      bottlenecks,
      cycles,
    },
    highlights,
  };
}
