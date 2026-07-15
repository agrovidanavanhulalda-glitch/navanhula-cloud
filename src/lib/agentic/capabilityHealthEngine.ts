/**
 * Sprint 5.0 · Capability Health Engine (pure).
 */
import type { Capability } from './businessCapabilityEngine';

export interface CapabilityHealth {
  id: string;
  score: number;
  rating: 'CRITICAL' | 'AT_RISK' | 'STABLE' | 'HEALTHY';
}

export interface HealthSummary {
  total: number;
  avgScore: number;
  distribution: { CRITICAL: number; AT_RISK: number; STABLE: number; HEALTHY: number };
  items: CapabilityHealth[];
}

export function evaluateCapabilityHealth(list: Capability[]): HealthSummary {
  const items: CapabilityHealth[] = list.map((c) => {
    const score = Math.round(c.health * 0.6 + (100 - c.risk) * 0.3 + (c.maturity / 5) * 100 * 0.1);
    let rating: CapabilityHealth['rating'];
    if (score >= 80) rating = 'HEALTHY';
    else if (score >= 60) rating = 'STABLE';
    else if (score >= 40) rating = 'AT_RISK';
    else rating = 'CRITICAL';
    return { id: c.id, score, rating };
  }).sort((a, b) => a.id.localeCompare(b.id));

  const dist = { CRITICAL: 0, AT_RISK: 0, STABLE: 0, HEALTHY: 0 };
  items.forEach((i) => dist[i.rating]++);
  const avgScore = items.length ? Math.round(items.reduce((a, b) => a + b.score, 0) / items.length) : 0;
  return { total: items.length, avgScore, distribution: dist, items };
}
