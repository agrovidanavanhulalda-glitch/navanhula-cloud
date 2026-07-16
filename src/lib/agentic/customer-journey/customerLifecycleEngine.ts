/**
 * Sprint 7.1 · Customer Lifecycle Engine (pure).
 * Groups journey stages into broader lifecycle phases.
 */
import type { JourneyStage } from './journeyStageEngine';

export type LifecyclePhase =
  | 'ACQUISITION' | 'ACTIVATION' | 'ADOPTION' | 'RETENTION' | 'EXPANSION' | 'ADVOCACY' | 'RISK';

export function lifecycleOf(stage: JourneyStage): LifecyclePhase {
  switch (stage) {
    case 'LEAD':
    case 'TRIAL':
      return 'ACQUISITION';
    case 'SETUP':
    case 'ONBOARDING':
    case 'FIRST_SALE':
      return 'ACTIVATION';
    case 'ACTIVE':
    case 'POWER_USER':
      return 'ADOPTION';
    case 'RENEWAL':
      return 'RETENTION';
    case 'EXPANSION':
      return 'EXPANSION';
    case 'CHAMPION':
      return 'ADVOCACY';
    case 'AT_RISK':
      return 'RISK';
  }
}
