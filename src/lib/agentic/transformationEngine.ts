/**
 * Sprint 5.1 · Transformation Engine (pure, deterministic).
 * Normalizes transformation initiatives from consultative inputs.
 */
export interface TransformationInput {
  id?: string;
  name?: string;
  pillar?: 'PEOPLE' | 'PROCESS' | 'TECHNOLOGY' | 'DATA' | 'GOVERNANCE';
  progress?: number; // 0-100
  ambition?: number; // 0-100 target aspiration
  investment?: number; // >= 0
  value?: number; // expected business value >= 0
  risk?: number; // 0-100
  alignment?: number; // 0-100 strategic alignment
  maturity?: number; // 0-5
}

export interface TransformationItem {
  id: string;
  name: string;
  pillar: TransformationInput['pillar'];
  progress: number;
  ambition: number;
  investment: number;
  value: number;
  risk: number;
  alignment: number;
  maturity: number;
}

const PILLARS: NonNullable<TransformationInput['pillar']>[] = [
  'PEOPLE', 'PROCESS', 'TECHNOLOGY', 'DATA', 'GOVERNANCE',
];

const clamp = (n: unknown, min: number, max: number): number => {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(min, Math.min(max, x));
};

const nonNeg = (n: unknown): number => {
  const x = typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0;
  return x;
};

export function normalizeTransformations(items: unknown): TransformationItem[] {
  if (!Array.isArray(items)) return [];
  const out: TransformationItem[] = [];
  items.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object') return;
    const r = raw as TransformationInput;
    if (!r.id) return;
    out.push({
      id: String(r.id),
      name: typeof r.name === 'string' && r.name ? r.name : `Initiative ${i + 1}`,
      pillar: PILLARS.includes(r.pillar as never) ? r.pillar : 'PROCESS',
      progress: clamp(r.progress, 0, 100),
      ambition: clamp(r.ambition ?? 100, 0, 100),
      investment: nonNeg(r.investment),
      value: nonNeg(r.value),
      risk: clamp(r.risk, 0, 100),
      alignment: clamp(r.alignment, 0, 100),
      maturity: clamp(r.maturity, 0, 5),
    });
  });
  return out;
}
