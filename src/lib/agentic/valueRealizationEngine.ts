/**
 * Sprint 5.1 · Value Realization Engine (pure).
 */
import type { TransformationItem } from './transformationEngine';

export interface ValueRealization {
  realizationRate: number; // 0-100+
  realizedValue: number;
  expectedValue: number;
  rating: 'FAILING' | 'PARTIAL' | 'ON_TRACK' | 'EXCEEDING';
}

export function evaluateRealization(items: TransformationItem[] = []): ValueRealization {
  const list = Array.isArray(items) ? items : [];
  const expectedValue = list.reduce((s, i) => s + i.value, 0);
  const realizedValue = list.reduce((s, i) => s + (i.value * (i.progress / 100)), 0);
  const realizationRate = expectedValue === 0
    ? (list.length > 0 ? 0 : 0)
    : Math.max(0, Math.min(200, Math.round((realizedValue / expectedValue) * 100)));
  const rating: ValueRealization['rating'] =
    realizationRate >= 100 ? 'EXCEEDING' :
    realizationRate >= 70 ? 'ON_TRACK' :
    realizationRate >= 35 ? 'PARTIAL' : 'FAILING';
  return {
    realizationRate,
    realizedValue: Math.round(realizedValue),
    expectedValue: Math.round(expectedValue),
    rating,
  };
}
