/**
 * Sprint 5.2 · Risk Register Engine (pure).
 */
import type { NormalizedRisk, RiskCategory } from './enterpriseRiskEngine';
import { inherentRisk } from './enterpriseRiskEngine';

export interface RegisterRow {
  id: string;
  name: string;
  category: RiskCategory;
  inherent: number;
}

export function buildRegister(list: NormalizedRisk[]): RegisterRow[] {
  return list
    .map((r) => ({ id: r.id, name: r.name, category: r.category, inherent: inherentRisk(r) }))
    .sort((a, b) => (b.inherent - a.inherent) || a.id.localeCompare(b.id));
}
