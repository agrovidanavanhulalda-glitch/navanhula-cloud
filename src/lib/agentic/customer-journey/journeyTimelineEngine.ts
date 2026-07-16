/**
 * Sprint 7.1 · Journey Timeline Engine (pure).
 * Produces an ordered timeline of the customer's traversed stages.
 */
import { JOURNEY_STAGES, type JourneyStage } from './journeyStageEngine';

export interface TimelineStep {
  readonly stage: JourneyStage;
  readonly reached: boolean;
  readonly current: boolean;
}

export function buildJourneyTimeline(current: JourneyStage): TimelineStep[] {
  if (current === 'AT_RISK') {
    return JOURNEY_STAGES.map((stage) => ({ stage, reached: false, current: false }));
  }
  const idx = JOURNEY_STAGES.indexOf(current);
  return JOURNEY_STAGES.map((stage, i) => ({
    stage,
    reached: idx >= 0 && i <= idx,
    current: i === idx,
  }));
}
