/**
 * Sprint 4.4 · Recommendation Memory (pure).
 * Turns patterns into actionable, advisory recommendations.
 */
import type { DetectedPattern } from './patternEngine';

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export function buildRecommendations(patterns: DetectedPattern[] = []): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const p of patterns ?? []) {
    switch (p.kind) {
      case 'FREQUENT_REJECTION':
        recs.push({
          id: `rec-rej-${p.key}`,
          title: `Revisar plano "${p.title}"`,
          detail: `${p.detail} — considere ajustar o escopo antes de reenviar.`,
          priority: 'HIGH',
        });
        break;
      case 'RECURRING_FAILURE':
        recs.push({
          id: `rec-fail-${p.key}`,
          title: `Investigar causa raiz de "${p.title}"`,
          detail: p.detail,
          priority: 'HIGH',
        });
        break;
      case 'BOTTLENECK':
        recs.push({
          id: `rec-bn-${p.key}`,
          title: `Reduzir tempo de aprovação em "${p.title}"`,
          detail: p.detail,
          priority: 'MEDIUM',
        });
        break;
      case 'RECURRING_PLAN':
        recs.push({
          id: `rec-rec-${p.key}`,
          title: `Padronizar template para "${p.title}"`,
          detail: `${p.count} execuções semelhantes — bom candidato a template reutilizável.`,
          priority: 'LOW',
        });
        break;
      case 'FREQUENT_APPROVAL':
        recs.push({
          id: `rec-ok-${p.key}`,
          title: `Alta confiança em "${p.title}"`,
          detail: `${p.detail} — manter processo atual.`,
          priority: 'LOW',
        });
        break;
    }
  }
  return recs.slice(0, 20);
}
