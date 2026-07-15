/**
 * Sprint 4.3 · Plan Diff Engine (pure).
 * Compares two plan version snapshots.
 */
import type { PlanVersion, PlanVersionSnapshot } from './versionEngine';

export interface PlanDiffField {
  field: keyof PlanVersionSnapshot;
  before: string | number;
  after: string | number;
  delta?: number;
}

export interface PlanDiff {
  fromVersion: number;
  toVersion: number;
  changed: PlanDiffField[];
  unchanged: number;
  summary: string;
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function diffVersions(a: PlanVersion | null, b: PlanVersion | null): PlanDiff {
  if (!a || !b) {
    return {
      fromVersion: a?.version ?? 0,
      toVersion: b?.version ?? 0,
      changed: [],
      unchanged: 0,
      summary: 'Diff indisponível — versão ausente',
    };
  }
  const changed: PlanDiffField[] = [];
  let unchanged = 0;
  const keys = Object.keys(a.snapshot) as (keyof PlanVersionSnapshot)[];
  for (const k of keys) {
    const va = a.snapshot[k];
    const vb = b.snapshot[k];
    if (va === vb) {
      unchanged++;
      continue;
    }
    const numericA = typeof va === 'number' ? va : Number.NaN;
    const numericB = typeof vb === 'number' ? vb : Number.NaN;
    const delta = Number.isFinite(numericA) && Number.isFinite(numericB) ? safeNum(numericB) - safeNum(numericA) : undefined;
    changed.push({
      field: k,
      before: (va as string | number) ?? '',
      after: (vb as string | number) ?? '',
      delta,
    });
  }
  const summary =
    changed.length === 0
      ? 'Sem mudanças entre versões'
      : `${changed.length} campos alterados (${unchanged} inalterados)`;
  return { fromVersion: a.version, toVersion: b.version, changed, unchanged, summary };
}
