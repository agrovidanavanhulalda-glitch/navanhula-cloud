/**
 * Sprint 5.0 · Capability Risk Engine (pure).
 */
import type { Capability } from './businessCapabilityEngine';

export interface CapabilityRisk {
  id: string;
  risk: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  drivers: string[];
}

export function assessCapabilityRisks(list: Capability[]): CapabilityRisk[] {
  return list
    .map((c) => {
      const drivers: string[] = [];
      const rawRisk = c.risk;
      const lowMaturity = c.maturity <= 1 ? 25 : 0;
      const lowHealth = c.health < 50 ? 20 : 0;
      const highCrit = c.criticality >= 80 ? 15 : 0;
      if (lowMaturity) drivers.push('LOW_MATURITY');
      if (lowHealth) drivers.push('LOW_HEALTH');
      if (highCrit) drivers.push('HIGH_CRITICALITY');
      if (rawRisk >= 60) drivers.push('BASE_RISK');
      const risk = Math.min(100, Math.round(rawRisk * 0.6 + lowMaturity + lowHealth + highCrit));
      let level: CapabilityRisk['level'];
      if (risk >= 80) level = 'CRITICAL';
      else if (risk >= 60) level = 'HIGH';
      else if (risk >= 30) level = 'MEDIUM';
      else level = 'LOW';
      return { id: c.id, risk, level, drivers };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
