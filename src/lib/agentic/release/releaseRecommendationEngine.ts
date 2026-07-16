/**
 * Sprint 5.6.2 · Release Recommendation Engine — pure prioritized actions.
 */
import type { ReleaseReadinessV2Report } from './releaseReadinessV2';

export interface RecommendationV2 {
  readonly id: string;
  readonly priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  readonly action: string;
  readonly gap: number;
}

const priority = (gap: number): RecommendationV2['priority'] =>
  gap >= 30 ? 'CRITICAL' : gap >= 15 ? 'HIGH' : gap >= 5 ? 'MEDIUM' : 'LOW';

export function recommendReleaseActions(
  readiness: ReleaseReadinessV2Report,
): readonly RecommendationV2[] {
  return readiness.criteria
    .filter((c) => !c.passed)
    .map((c) => {
      const gap = Math.max(0, c.threshold - c.value);
      return {
        id: `rec-${c.id}`,
        priority: priority(gap),
        action: `Elevar "${c.label}" para ≥ ${c.threshold} (atual ${c.value}, gap ${gap}).`,
        gap,
      };
    });
}
