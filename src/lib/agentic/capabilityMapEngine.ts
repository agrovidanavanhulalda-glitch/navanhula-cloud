/**
 * Sprint 5.0 · Capability Map Engine (pure).
 */
import type { Capability } from './businessCapabilityEngine';

export interface CapabilityMap {
  domains: Array<{ domain: string; capabilities: Capability[]; count: number }>;
  heatmap: Array<{ id: string; name: string; domain: string; heat: number }>;
  total: number;
}

export function buildCapabilityMap(list: Capability[]): CapabilityMap {
  const byDomain = new Map<string, Capability[]>();
  for (const c of list) {
    if (!byDomain.has(c.domain)) byDomain.set(c.domain, []);
    byDomain.get(c.domain)!.push(c);
  }
  const domains = Array.from(byDomain.entries())
    .map(([domain, capabilities]) => ({ domain, capabilities, count: capabilities.length }))
    .sort((a, b) => a.domain.localeCompare(b.domain));
  const heatmap = list
    .map((c) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      // heat: 0 (cool/healthy) → 100 (hot/at risk)
      heat: Math.round(
        c.criticality * 0.4 + c.risk * 0.4 + (100 - c.health) * 0.2,
      ),
    }))
    .sort((a, b) => b.heat - a.heat || a.id.localeCompare(b.id));
  return { domains, heatmap, total: list.length };
}
