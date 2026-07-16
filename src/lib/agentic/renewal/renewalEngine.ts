/**
 * Sprint 7.3 · Renewal Engine — computes renewal stage & days-to-renewal.
 */
import type { RenewalContract, RenewalStage } from './types';
import { daysUntil } from './_utils';

export interface RenewalStatus {
  readonly daysToRenewal: number;
  readonly stage: RenewalStage;
  readonly isExpired: boolean;
}

export function evaluateRenewal(c: RenewalContract, now: Date = new Date()): RenewalStatus {
  const d = daysUntil(c.renewalDate, now);
  let stage: RenewalStage;
  if (d < 0) stage = 'EXPIRED';
  else if (d <= 7) stage = 'DUE_NOW';
  else if (d <= 30) stage = 'DUE_30D';
  else if (d <= 60) stage = 'DUE_60D';
  else if (d <= 90) stage = 'DUE_90D';
  else stage = 'FUTURE';
  return { daysToRenewal: d, stage, isExpired: d < 0 };
}
