/**
 * Sprint 4.4 · History Engine (pure).
 * Builds decision timeline and evolution buckets.
 */
import type { DecisionRecord } from './decisionMemory';

export interface HistoryEvent {
  id: string;
  title: string;
  status: string;
  at: string;
}

export interface EvolutionBucket {
  bucket: string;
  count: number;
  approved: number;
  rejected: number;
}

export function buildDecisionTimeline(decisions: DecisionRecord[] = [], limit = 30): HistoryEvent[] {
  return (decisions ?? [])
    .filter(Boolean)
    .slice()
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, Math.max(0, limit))
    .map((d) => ({ id: d.id, title: d.title, status: d.status, at: d.updatedAt }));
}

export function buildEvolution(decisions: DecisionRecord[] = []): EvolutionBucket[] {
  const map = new Map<string, EvolutionBucket>();
  for (const d of decisions ?? []) {
    if (!d) continue;
    const t = Date.parse(d.updatedAt);
    if (!Number.isFinite(t)) continue;
    const bucket = new Date(t).toISOString().slice(0, 10);
    const entry = map.get(bucket) ?? { bucket, count: 0, approved: 0, rejected: 0 };
    entry.count++;
    if (d.status === 'APPROVED' || d.status === 'EXECUTED') entry.approved++;
    if (d.status === 'REJECTED') entry.rejected++;
    map.set(bucket, entry);
  }
  return Array.from(map.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
}
