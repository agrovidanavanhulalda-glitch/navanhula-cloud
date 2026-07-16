import type { Customer360Input } from './types';
import { avg, round } from './_utils';
import { computeCustomer360Score } from './customer360Score';

export interface Benchmark {
  readonly avgScore: number;
  readonly avgHealth: number;
  readonly avgNps: number;
  readonly avgCsat: number;
  readonly avgRenewal: number;
  readonly avgMrr: number;
}

export function computeBenchmark(customers: readonly Customer360Input[]): Benchmark {
  return {
    avgScore: round(avg(customers.map((c) => computeCustomer360Score(c).score))),
    avgHealth: round(avg(customers.map((c) => c.healthScore))),
    avgNps: round(avg(customers.map((c) => c.nps))),
    avgCsat: round(avg(customers.map((c) => c.csat))),
    avgRenewal: round(avg(customers.map((c) => c.renewalScore))),
    avgMrr: round(avg(customers.map((c) => c.mrr))),
  };
}
