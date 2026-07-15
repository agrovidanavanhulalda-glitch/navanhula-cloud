/**
 * Sprint 5.0 · Business Capability Engine (pure, consultative).
 * No side effects. No network. No writes.
 */

export interface CapabilityInput {
  id: string;
  name?: string;
  domain?: string;
  boundedContext?: string;
  maturity?: number;      // 0-5
  health?: number;        // 0-100
  criticality?: number;   // 0-100
  risk?: number;          // 0-100
  dependsOn?: string[];
  tags?: string[];
}

export interface Capability {
  id: string;
  name: string;
  domain: string;
  boundedContext: string;
  maturity: number;
  health: number;
  criticality: number;
  risk: number;
  dependsOn: string[];
  tags: string[];
}

const clamp = (n: unknown, min: number, max: number): number => {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(min, Math.min(max, x));
};

const safeStr = (s: unknown, fallback: string): string =>
  typeof s === 'string' && s.length > 0 ? s : fallback;

export function normalizeCapabilities(items: CapabilityInput[] = []): Capability[] {
  const list = Array.isArray(items) ? items : [];
  return list
    .filter((c) => c && typeof c.id === 'string' && c.id.length > 0)
    .map((c) => ({
      id: c.id,
      name: safeStr(c.name, c.id),
      domain: safeStr(c.domain, 'general'),
      boundedContext: safeStr(c.boundedContext, safeStr(c.domain, 'general')),
      maturity: clamp(c.maturity, 0, 5),
      health: clamp(c.health, 0, 100),
      criticality: clamp(c.criticality, 0, 100),
      risk: clamp(c.risk, 0, 100),
      dependsOn: Array.isArray(c.dependsOn) ? c.dependsOn.filter((x) => typeof x === 'string') : [],
      tags: Array.isArray(c.tags) ? c.tags.filter((x) => typeof x === 'string') : [],
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
