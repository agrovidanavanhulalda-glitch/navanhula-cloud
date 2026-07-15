/**
 * Sprint 4.4 · Memory Engine (pure).
 * Groups similar decisions and aggregates memory statistics.
 */
import type { DecisionRecord } from './decisionMemory';

export interface MemoryGroup {
  key: string;
  title: string;
  size: number;
  approved: number;
  rejected: number;
  cancelled: number;
  expired: number;
  pending: number;
  avgRisk: number;
  avgConfidence: number;
  avgDurationMs: number;
}

export interface MemoryStats {
  total: number;
  groups: MemoryGroup[];
  uniqueTitles: number;
  memorySize: number;
}

function slugify(t: string): string {
  return (t || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64) || 'untitled';
}

function avg(nums: number[]): number {
  const clean = nums.filter((n) => Number.isFinite(n));
  if (clean.length === 0) return 0;
  return Math.round(clean.reduce((a, b) => a + b, 0) / clean.length);
}

export function groupDecisions(decisions: DecisionRecord[] = []): MemoryGroup[] {
  const map = new Map<string, DecisionRecord[]>();
  for (const d of decisions ?? []) {
    if (!d) continue;
    const k = slugify(d.title);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(d);
  }
  return Array.from(map.entries())
    .map(([key, items]) => ({
      key,
      title: items[0].title,
      size: items.length,
      approved: items.filter((i) => i.status === 'APPROVED').length,
      rejected: items.filter((i) => i.status === 'REJECTED').length,
      cancelled: items.filter((i) => i.status === 'CANCELLED').length,
      expired: items.filter((i) => i.status === 'EXPIRED').length,
      pending: items.filter((i) => i.status === 'PENDING').length,
      avgRisk: avg(items.map((i) => i.riskScore)),
      avgConfidence: avg(items.map((i) => i.confidence)),
      avgDurationMs: avg(items.map((i) => i.durationMs)),
    }))
    .sort((a, b) => b.size - a.size);
}

export function computeMemoryStats(decisions: DecisionRecord[] = []): MemoryStats {
  const groups = groupDecisions(decisions);
  return {
    total: decisions?.length ?? 0,
    groups,
    uniqueTitles: groups.length,
    memorySize: groups.reduce((s, g) => s + g.size, 0),
  };
}
