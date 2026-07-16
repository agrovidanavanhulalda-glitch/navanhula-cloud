/**
 * Sprint 7.1 · Journey Summary Engine (pure).
 * Human-readable narrative summary for a single customer.
 */
import type { JourneyStage } from './journeyStageEngine';
import type { JourneyScore } from './journeyScoreEngine';
import type { MilestoneResult } from './milestoneEngine';
import { lifecycleOf, type LifecyclePhase } from './customerLifecycleEngine';

export interface JourneySummary {
  readonly headline: string;
  readonly stage: JourneyStage;
  readonly phase: LifecyclePhase;
  readonly nextAction: string;
}

export function summarizeJourney(
  stage: JourneyStage,
  score: JourneyScore,
  milestones: MilestoneResult,
): JourneySummary {
  const phase = lifecycleOf(stage);
  const next = milestones.nextMilestone?.label ?? 'Manter cadência atual';
  let headline: string;
  switch (phase) {
    case 'ACQUISITION': headline = 'Cliente em avaliação inicial'; break;
    case 'ACTIVATION': headline = 'Cliente em ativação'; break;
    case 'ADOPTION': headline = 'Cliente ativo em adoção'; break;
    case 'RETENTION': headline = 'Cliente em ciclo de renovação'; break;
    case 'EXPANSION': headline = 'Cliente em expansão'; break;
    case 'ADVOCACY': headline = 'Cliente champion'; break;
    case 'RISK': headline = 'Cliente em risco de churn'; break;
  }
  const nextAction = phase === 'RISK'
    ? 'Contacto proativo do CS'
    : score.score < 50
    ? 'Acompanhamento do CS'
    : `Progredir para: ${next}`;
  return { headline, stage, phase, nextAction };
}
