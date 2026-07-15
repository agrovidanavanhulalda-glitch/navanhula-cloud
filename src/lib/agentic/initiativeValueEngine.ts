/**
 * Sprint 5.1 · Initiative Value Engine (pure).
 * Ranks initiatives by value/risk/alignment.
 */
import type { TransformationItem } from './transformationEngine';

export interface RankedInitiative {
  id: string;
  name: string;
  score: number; // 0-100
  band: 'P0' | 'P1' | 'P2' | 'P3';
}

export function rankInitiatives(items: TransformationItem[] = []): RankedInitiative[] {
  const list = Array.isArray(items) ? items : [];
  const maxValue = list.reduce((m, i) => Math.max(m, i.value), 0) || 1;
  return list
    .map((i) => {
      const valueNorm = (i.value / maxValue) * 100;
      const raw = valueNorm * 0.5 + i.alignment * 0.3 + (100 - i.risk) * 0.2;
      const score = Math.max(0, Math.min(100, Math.round(raw)));
      const band: RankedInitiative['band'] =
        score >= 80 ? 'P0' : score >= 60 ? 'P1' : score >= 35 ? 'P2' : 'P3';
      return { id: i.id, name: i.name, score, band };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
