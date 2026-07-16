/**
 * Sprint 7.3 · Renewal Pipeline — grouped stage distribution.
 */
import type { RenewalContract, RenewalStage } from './types';
import { evaluateRenewal } from './renewalEngine';
import { num, round } from './_utils';

export interface RenewalPipelineBucket {
  readonly stage: RenewalStage;
  readonly count: number;
  readonly mrr: number;
}

export interface RenewalPipeline {
  readonly buckets: readonly RenewalPipelineBucket[];
  readonly totalContracts: number;
  readonly totalMrr: number;
}

const ORDER: RenewalStage[] = ['EXPIRED', 'DUE_NOW', 'DUE_30D', 'DUE_60D', 'DUE_90D', 'FUTURE'];

export function buildRenewalPipeline(
  contracts: readonly RenewalContract[],
  now: Date = new Date(),
): RenewalPipeline {
  const acc: Record<RenewalStage, { count: number; mrr: number }> = {
    EXPIRED: { count: 0, mrr: 0 },
    DUE_NOW: { count: 0, mrr: 0 },
    DUE_30D: { count: 0, mrr: 0 },
    DUE_60D: { count: 0, mrr: 0 },
    DUE_90D: { count: 0, mrr: 0 },
    FUTURE: { count: 0, mrr: 0 },
  };
  let totalMrr = 0;
  for (const c of contracts) {
    const { stage } = evaluateRenewal(c, now);
    const mrr = num(c.mrr);
    acc[stage].count += 1;
    acc[stage].mrr += mrr;
    totalMrr += mrr;
  }
  const buckets = ORDER.map((stage) => ({
    stage,
    count: acc[stage].count,
    mrr: round(acc[stage].mrr),
  }));
  return { buckets, totalContracts: contracts.length, totalMrr: round(totalMrr) };
}
