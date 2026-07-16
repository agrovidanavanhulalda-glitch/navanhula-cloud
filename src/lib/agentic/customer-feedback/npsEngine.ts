/**
 * NPS = (%Promoters - %Detractors), range -100..100.
 */
import { FeedbackEntry } from './types';
import { countPromoters } from './promoterEngine';
import { countDetractors } from './detractorEngine';
import { countPassives } from './passiveEngine';

export interface NpsResult {
  readonly nps: number;         // -100..100
  readonly promoters: number;
  readonly passives: number;
  readonly detractors: number;
  readonly total: number;
  readonly promoterPct: number;
  readonly passivePct: number;
  readonly detractorPct: number;
}

export function computeNps(entries: readonly FeedbackEntry[]): NpsResult {
  const total = entries.length;
  const promoters = countPromoters(entries);
  const detractors = countDetractors(entries);
  const passives = countPassives(entries);
  if (total === 0) {
    return { nps: 0, promoters: 0, passives: 0, detractors: 0, total: 0,
      promoterPct: 0, passivePct: 0, detractorPct: 0 };
  }
  const promoterPct = (promoters / total) * 100;
  const passivePct = (passives / total) * 100;
  const detractorPct = (detractors / total) * 100;
  return {
    nps: Math.round(promoterPct - detractorPct),
    promoters, passives, detractors, total,
    promoterPct: Math.round(promoterPct),
    passivePct: Math.round(passivePct),
    detractorPct: Math.round(detractorPct),
  };
}
