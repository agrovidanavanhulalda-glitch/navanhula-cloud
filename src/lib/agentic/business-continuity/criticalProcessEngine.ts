/**
 * Sprint 5.4 · Critical Process Engine — pure.
 */
import type { BIARow } from './businessImpactAnalysis';

export function rankCriticalProcesses(bia: BIARow[]): BIARow[] {
  return bia
    .filter((r) => r.tier === 'TIER_1' || r.tier === 'TIER_2')
    .slice()
    .sort((a, b) => (b.impactScore - a.impactScore) || a.id.localeCompare(b.id));
}
