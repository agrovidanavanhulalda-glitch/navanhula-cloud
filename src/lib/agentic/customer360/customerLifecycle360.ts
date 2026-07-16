import type { Customer360Input } from './types';

export interface Lifecycle360 {
  readonly stage: Customer360Input['lifecycleStage'];
  readonly label: string;
}

const LABELS: Record<Customer360Input['lifecycleStage'], string> = {
  onboarding: 'Onboarding',
  adoption: 'Adoção',
  retention: 'Retenção',
  expansion: 'Expansão',
  renewal: 'Renovação',
  churn: 'Churn',
};

export function computeLifecycle360(c: Customer360Input): Lifecycle360 {
  const stage = c.lifecycleStage ?? 'onboarding';
  return { stage, label: LABELS[stage] ?? 'Desconhecido' };
}
