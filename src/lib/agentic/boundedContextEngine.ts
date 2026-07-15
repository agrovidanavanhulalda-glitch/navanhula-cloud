/**
 * Sprint 5.0 · Bounded Context Engine (pure).
 * Groups capabilities into DDD-style bounded contexts.
 */
import type { Capability } from './businessCapabilityEngine';

export interface BoundedContext {
  name: string;
  domain: string;
  capabilities: string[];
  size: number;
  cohesion: number;   // 0-100 (based on shared domain)
  coupling: number;   // 0-100 (external dependencies)
}

export function deriveBoundedContexts(list: Capability[]): BoundedContext[] {
  const map = new Map<string, Capability[]>();
  for (const c of list) {
    const key = c.boundedContext;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  const idToContext = new Map<string, string>();
  for (const c of list) idToContext.set(c.id, c.boundedContext);

  return Array.from(map.entries())
    .map(([name, caps]) => {
      const domains = new Set(caps.map((c) => c.domain));
      const cohesion = domains.size === 0 ? 0 : Math.round(100 / domains.size);
      let external = 0;
      let total = 0;
      for (const c of caps) {
        for (const dep of c.dependsOn) {
          total++;
          if (idToContext.get(dep) && idToContext.get(dep) !== name) external++;
        }
      }
      const coupling = total === 0 ? 0 : Math.round((external / total) * 100);
      return {
        name,
        domain: caps[0]?.domain ?? 'general',
        capabilities: caps.map((c) => c.id).sort(),
        size: caps.length,
        cohesion,
        coupling,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
