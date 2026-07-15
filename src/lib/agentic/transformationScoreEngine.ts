/**
 * Sprint 5.1 · Transformation Score Engine (pure).
 */
import type { TransformationItem } from './transformationEngine';
import { computeValueScore } from './valueEngine';
import { evaluateRealization } from './valueRealizationEngine';
import { evaluateAlignment } from './kpiAlignmentEngine';
import { assessRisks } from './transformationRiskEngine';

export interface TransformationScore {
  score: number;
  rating: 'D' | 'C' | 'B' | 'A' | 'A+';
  breakdown: {
    value: number;
    realization: number;
    alignment: number;
    riskInverse: number;
  };
}

export function computeTransformationScore(items: TransformationItem[] = []): TransformationScore {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) {
    return {
      score: 0,
      rating: 'D',
      breakdown: { value: 0, realization: 0, alignment: 0, riskInverse: 0 },
    };
  }
  const value = computeValueScore(list).score;
  const realization = Math.min(100, evaluateRealization(list).realizationRate);
  const alignment = evaluateAlignment(list).avgAlignment;
  const riskInverse = 100 - assessRisks(list).avgRisk;
  const score = Math.max(
    0,
    Math.min(100, Math.round(value * 0.3 + realization * 0.3 + alignment * 0.2 + riskInverse * 0.2)),
  );
  const rating: TransformationScore['rating'] =
    score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 45 ? 'C' : 'D';
  return { score, rating, breakdown: { value, realization, alignment, riskInverse } };
}
