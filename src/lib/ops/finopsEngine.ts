/**
 * Sprint 3.0 · FinOps Engine (read-only estimates, no provider integration).
 * All rates are internal estimates in USD; adjust in ONE place.
 */

export const FINOPS_RATES = {
  storagePerGbMonth: 0.021,
  bandwidthPerGb: 0.09,
  rpcPer1M: 1.30,
  edgeInvocPer1M: 2.00,
  realtimeChannelMonth: 0.01,
  workerRunPer1M: 0.40,
  dbPerGbMonth: 0.125,
} as const;

export interface FinopsInputs {
  storageGb: number;
  bandwidthGbMonth: number;
  rpcCountMonth: number;
  edgeInvocMonth: number;
  realtimeChannels: number;
  workerRunsMonth: number;
  dbGb: number;
  companies: number;
  salesMonth: number;
  activeUsers: number;
}

export interface FinopsSnapshot {
  perService: Record<string, number>;
  totalMonthly: number;
  costPerCompany: number;
  costPerSale: number;
  costPerActiveUser: number;
  costPerGb: number;
}

export function computeFinops(i: FinopsInputs): FinopsSnapshot {
  const r = FINOPS_RATES;
  const perService = {
    storage: i.storageGb * r.storagePerGbMonth,
    bandwidth: i.bandwidthGbMonth * r.bandwidthPerGb,
    rpc: (i.rpcCountMonth / 1_000_000) * r.rpcPer1M,
    edge: (i.edgeInvocMonth / 1_000_000) * r.edgeInvocPer1M,
    realtime: i.realtimeChannels * r.realtimeChannelMonth,
    workers: (i.workerRunsMonth / 1_000_000) * r.workerRunPer1M,
    database: i.dbGb * r.dbPerGbMonth,
  };
  const totalMonthly = Object.values(perService).reduce((a, b) => a + b, 0);
  const totalGb = i.storageGb + i.dbGb;
  return {
    perService,
    totalMonthly,
    costPerCompany: i.companies ? totalMonthly / i.companies : 0,
    costPerSale: i.salesMonth ? totalMonthly / i.salesMonth : 0,
    costPerActiveUser: i.activeUsers ? totalMonthly / i.activeUsers : 0,
    costPerGb: totalGb ? totalMonthly / totalGb : 0,
  };
}
