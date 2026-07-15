/**
 * Sprint 5.0 · Enterprise Domain Engine (pure).
 */
import type { Capability } from './businessCapabilityEngine';

export interface DomainReport {
  domain: string;
  capabilities: number;
  avgHealth: number;
  avgMaturity: number;
  avgRisk: number;
  criticalCount: number;
}

export function analyzeDomains(list: Capability[]): DomainReport[] {
  const map = new Map<string, Capability[]>();
  for (const c of list) {
    if (!map.has(c.domain)) map.set(c.domain, []);
    map.get(c.domain)!.push(c);
  }
  return Array.from(map.entries())
    .map(([domain, caps]) => {
      const n = caps.length || 1;
      return {
        domain,
        capabilities: caps.length,
        avgHealth: Math.round(caps.reduce((a, b) => a + b.health, 0) / n),
        avgMaturity: Math.round((caps.reduce((a, b) => a + b.maturity, 0) / n) * 100) / 100,
        avgRisk: Math.round(caps.reduce((a, b) => a + b.risk, 0) / n),
        criticalCount: caps.filter((c) => c.criticality >= 70).length,
      };
    })
    .sort((a, b) => a.domain.localeCompare(b.domain));
}
