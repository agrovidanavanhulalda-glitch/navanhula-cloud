/**
 * Sprint 5.6.3 · GA Final Decision — GA CERTIFIED / RC.
 */
import type { GaChecklistReport } from './gaChecklistEngine';

export type GaFinalStatus = 'GA_CERTIFIED' | 'RC';
export type GaDeployment = 'GO' | 'CONDITIONAL_GO';

export interface GaFinalDecisionReport {
  readonly status: GaFinalStatus;
  readonly deployment: GaDeployment;
  readonly reason: string;
}

export function decideGaFinal(checklist: GaChecklistReport): GaFinalDecisionReport {
  const status: GaFinalStatus = checklist.allPassed ? 'GA_CERTIFIED' : 'RC';
  const deployment: GaDeployment = checklist.allPassed ? 'GO' : 'CONDITIONAL_GO';
  const reason = checklist.allPassed
    ? `Todos os ${checklist.totalCount} critérios GA satisfeitos.`
    : `${checklist.totalCount - checklist.passedCount} critério(s) pendente(s).`;
  return { status, deployment, reason };
}
