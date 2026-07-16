/**
 * Executive summary derived deterministically from the aggregated feedback score.
 */
import { FeedbackScore } from './feedbackScoreEngine';
import { NpsResult } from './npsEngine';

export interface FeedbackSummary {
  readonly headline: string;
  readonly rating: 'CRITICAL' | 'AT_RISK' | 'STABLE' | 'HEALTHY' | 'CHAMPION';
  readonly nextAction: string;
}

export function summarize(score: FeedbackScore, nps: NpsResult): FeedbackSummary {
  const s = score.score;
  let rating: FeedbackSummary['rating'];
  if (s >= 85) rating = 'CHAMPION';
  else if (s >= 70) rating = 'HEALTHY';
  else if (s >= 55) rating = 'STABLE';
  else if (s >= 35) rating = 'AT_RISK';
  else rating = 'CRITICAL';

  const npsLabel = nps.total === 0 ? 'sem dados' : `NPS ${nps.nps}`;
  const headline = `Satisfação ${rating.toLowerCase()} · ${npsLabel} · CSAT ${score.csat}/100`;
  const nextAction = rating === 'CHAMPION'
    ? 'Manter cadência e ativar programa de referência.'
    : rating === 'HEALTHY'
    ? 'Explorar upsell junto aos promoters.'
    : rating === 'STABLE'
    ? 'Investigar categorias com menor avaliação.'
    : rating === 'AT_RISK'
    ? 'Acionar customer success sobre detractors.'
    : 'Intervenção executiva imediata com detractors.';
  return { headline, rating, nextAction };
}
