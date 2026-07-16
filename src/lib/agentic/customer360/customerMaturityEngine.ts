import type { Customer360Input } from './types';
import { num } from './_utils';

export type MaturityStage = 'NEW' | 'GROWING' | 'MATURE' | 'STRATEGIC';

export interface Maturity {
  readonly stage: MaturityStage;
  readonly tenureMonths: number;
}

export function computeMaturity(c: Customer360Input): Maturity {
  const days = Math.max(0, num(c.tenureDays));
  const months = Math.round(days / 30);
  let stage: MaturityStage = 'NEW';
  if (months >= 24) stage = 'STRATEGIC';
  else if (months >= 12) stage = 'MATURE';
  else if (months >= 3) stage = 'GROWING';
  return { stage, tenureMonths: months };
}
