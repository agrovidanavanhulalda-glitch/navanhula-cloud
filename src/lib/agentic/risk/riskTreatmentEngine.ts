/**
 * Sprint 5.2 · Risk Treatment Engine (pure).
 */
import type { NormalizedRisk } from './enterpriseRiskEngine';
import { inherentRisk } from './enterpriseRiskEngine';

export type TreatmentAction = 'MITIGATE' | 'TRANSFER' | 'ACCEPT' | 'AVOID';

export interface TreatmentRecommendation {
  id: string;
  name: string;
  action: TreatmentAction;
  rationale: string;
}

export function recommendTreatment(list: NormalizedRisk[]): TreatmentRecommendation[] {
  return list
    .map((r) => {
      const score = inherentRisk(r);
      let action: TreatmentAction;
      let rationale: string;
      if (score >= 75) {
        action = 'AVOID';
        rationale = 'Risco crítico — evitar exposição ou reformular processo.';
      } else if (score >= 50) {
        action = 'MITIGATE';
        rationale = 'Risco alto — implementar controles de mitigação prioritários.';
      } else if (score >= 25) {
        action = r.impact >= 60 ? 'TRANSFER' : 'MITIGATE';
        rationale = r.impact >= 60
          ? 'Risco moderado com impacto elevado — considerar transferência (seguro/contrato).'
          : 'Risco moderado — reforçar controles existentes.';
      } else {
        action = 'ACCEPT';
        rationale = 'Risco baixo — monitorar sem ação adicional.';
      }
      return { id: r.id, name: r.name, action, rationale };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
