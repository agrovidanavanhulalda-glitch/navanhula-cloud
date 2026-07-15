/**
 * Sprint 5.0 · Architecture Score Engine (pure).
 */
import type { Capability } from './businessCapabilityEngine';
import { evaluateCapabilityHealth } from './capabilityHealthEngine';
import { evaluateMaturity } from './capabilityMaturityEngine';
import { analyzeDependencies } from './capabilityDependencyEngine';
import { deriveBoundedContexts } from './boundedContextEngine';

export interface ArchitectureScore {
  score: number;
  rating: 'D' | 'C' | 'B' | 'A' | 'A+';
  breakdown: {
    health: number;
    maturity: number;
    coupling: number;
    dependencies: number;
  };
}

export function computeArchitectureScore(list: Capability[]): ArchitectureScore {
  if (list.length === 0) {
    return { score: 0, rating: 'D', breakdown: { health: 0, maturity: 0, coupling: 0, dependencies: 0 } };
  }
  const health = evaluateCapabilityHealth(list).avgScore;
  const maturityAvg = evaluateMaturity(list).avg;
  const maturity = Math.round((maturityAvg / 5) * 100);
  const contexts = deriveBoundedContexts(list);
  const avgCoupling = contexts.length
    ? Math.round(contexts.reduce((a, b) => a + b.coupling, 0) / contexts.length)
    : 0;
  const coupling = 100 - avgCoupling;
  const deps = analyzeDependencies(list);
  const dependencies = deps.hasCycle ? 40 : Math.max(0, 100 - deps.bottlenecks.length * 5);

  const score = Math.round(health * 0.35 + maturity * 0.3 + coupling * 0.2 + dependencies * 0.15);
  let rating: ArchitectureScore['rating'];
  if (score >= 90) rating = 'A+';
  else if (score >= 80) rating = 'A';
  else if (score >= 65) rating = 'B';
  else if (score >= 50) rating = 'C';
  else rating = 'D';
  return { score, rating, breakdown: { health, maturity, coupling, dependencies } };
}
