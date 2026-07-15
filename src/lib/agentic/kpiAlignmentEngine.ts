/**
 * Sprint 5.1 · KPI Alignment Engine (pure).
 */
import type { TransformationItem } from './transformationEngine';

export interface KpiAlignmentReport {
  avgAlignment: number;
  aligned: number;
  misaligned: number;
  rating: 'MISALIGNED' | 'PARTIAL' | 'ALIGNED' | 'FULLY_ALIGNED';
}

export function evaluateAlignment(items: TransformationItem[] = []): KpiAlignmentReport {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) {
    return { avgAlignment: 0, aligned: 0, misaligned: 0, rating: 'MISALIGNED' };
  }
  const avgAlignment = Math.round(list.reduce((s, i) => s + i.alignment, 0) / list.length);
  const aligned = list.filter((i) => i.alignment >= 70).length;
  const misaligned = list.filter((i) => i.alignment < 40).length;
  const rating: KpiAlignmentReport['rating'] =
    avgAlignment >= 90 ? 'FULLY_ALIGNED' :
    avgAlignment >= 70 ? 'ALIGNED' :
    avgAlignment >= 40 ? 'PARTIAL' : 'MISALIGNED';
  return { avgAlignment, aligned, misaligned, rating };
}
