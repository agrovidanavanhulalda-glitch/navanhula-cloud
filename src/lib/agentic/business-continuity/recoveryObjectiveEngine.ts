/**
 * Sprint 5.4 · Recovery Objective Engine — pure.
 * Derives RTO/RPO targets from BIA tier.
 */
import type { BIARow } from './businessImpactAnalysis';

export interface RecoveryObjectiveRow {
  id: string;
  name: string;
  tier: BIARow['tier'];
  rtoHours: number; // Recovery Time Objective
  rpoHours: number; // Recovery Point Objective
}

export interface RecoveryObjectivesReport {
  rows: RecoveryObjectiveRow[];
  averageRtoHours: number;
  averageRpoHours: number;
}

function targetsFor(tier: BIARow['tier']): { rto: number; rpo: number } {
  switch (tier) {
    case 'TIER_1': return { rto: 1, rpo: 0.25 };
    case 'TIER_2': return { rto: 4, rpo: 1 };
    case 'TIER_3': return { rto: 12, rpo: 4 };
    default:       return { rto: 48, rpo: 24 };
  }
}

export function computeRecoveryObjectives(bia: BIARow[]): RecoveryObjectivesReport {
  if (bia.length === 0) return { rows: [], averageRtoHours: 0, averageRpoHours: 0 };
  const rows = bia.map((b) => {
    const { rto, rpo } = targetsFor(b.tier);
    return { id: b.id, name: b.name, tier: b.tier, rtoHours: rto, rpoHours: rpo };
  });
  const avgRto = rows.reduce((s, r) => s + r.rtoHours, 0) / rows.length;
  const avgRpo = rows.reduce((s, r) => s + r.rpoHours, 0) / rows.length;
  return {
    rows,
    averageRtoHours: Math.round(avgRto * 100) / 100,
    averageRpoHours: Math.round(avgRpo * 100) / 100,
  };
}
