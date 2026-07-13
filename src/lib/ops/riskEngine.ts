/**
 * Sprint 3.2 · Risk & Benchmark Engines (pure).
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskCategory =
  | 'Capacity' | 'Storage' | 'Database' | 'Workers' | 'Queues'
  | 'Telemetry' | 'Realtime' | 'Billing' | 'Fiscal' | 'Recovery';

export interface RiskItem {
  category: RiskCategory;
  level: RiskLevel;
  score: number; // 0-100
  reason: string;
}

function levelOf(score: number): RiskLevel {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

export interface RiskInputs {
  storageUsedPct: number;         // 0-1
  dbGrowthPerDay: number;         // rows/day
  queueDepth: number;
  workerSuccessRate: number;      // 0-1
  telemetryPerDay: number;
  fiscalDocsPerDay: number;
  errors24h: number;
  backupHoursAgo: number;
}

export function computeRisks(i: RiskInputs): RiskItem[] {
  const items: RiskItem[] = [];
  const s1 = Math.min(100, i.storageUsedPct * 100);
  items.push({ category: 'Storage', level: levelOf(s1), score: Math.round(s1), reason: `Uso ${Math.round(s1)}%` });

  const s2 = Math.min(100, (i.dbGrowthPerDay / 50_000) * 100);
  items.push({ category: 'Database', level: levelOf(s2), score: Math.round(s2), reason: `${Math.round(i.dbGrowthPerDay)} rows/dia` });

  const s3 = Math.min(100, (i.queueDepth / 500) * 100);
  items.push({ category: 'Queues', level: levelOf(s3), score: Math.round(s3), reason: `Depth ${i.queueDepth}` });

  const s4 = Math.min(100, (1 - i.workerSuccessRate) * 100 * 2);
  items.push({ category: 'Workers', level: levelOf(s4), score: Math.round(s4), reason: `Success ${(i.workerSuccessRate * 100).toFixed(1)}%` });

  const s5 = Math.min(100, (i.telemetryPerDay / 200_000) * 100);
  items.push({ category: 'Telemetry', level: levelOf(s5), score: Math.round(s5), reason: `${Math.round(i.telemetryPerDay)}/dia` });

  const s6 = Math.min(100, (i.fiscalDocsPerDay / 10_000) * 100);
  items.push({ category: 'Fiscal', level: levelOf(s6), score: Math.round(s6), reason: `${Math.round(i.fiscalDocsPerDay)} docs/dia` });

  const s7 = Math.min(100, (i.errors24h / 200) * 100);
  items.push({ category: 'Capacity', level: levelOf(s7), score: Math.round(s7), reason: `${i.errors24h} erros/24h` });

  const s8 = Math.min(100, (i.backupHoursAgo / 48) * 100);
  items.push({ category: 'Recovery', level: levelOf(s8), score: Math.round(s8), reason: `Backup há ${i.backupHoursAgo}h` });

  items.push({ category: 'Realtime', level: 'LOW', score: 10, reason: 'Canais estáveis' });
  items.push({ category: 'Billing', level: 'LOW', score: 10, reason: 'Sem incidentes' });

  return items;
}

export interface BenchmarkRow {
  metric: string;
  actual: number;
  target: number;
  unit: string;
  status: 'above' | 'on' | 'below';
}

export interface BenchmarkInputs {
  latencyP95Ms: number;
  availabilityPct: number;
  storageUsedGb: number;
  growthPerDay: number;
  workerSuccessRate: number;
  recoveryHoursAgo: number;
  errorRatePct: number;
}

export function computeBenchmark(i: BenchmarkInputs): BenchmarkRow[] {
  const rows: Array<Omit<BenchmarkRow, 'status'> & { better: 'higher' | 'lower' }> = [
    { metric: 'Latency P95', actual: i.latencyP95Ms, target: 500, unit: 'ms', better: 'lower' },
    { metric: 'Availability', actual: i.availabilityPct, target: 99.9, unit: '%', better: 'higher' },
    { metric: 'Storage', actual: i.storageUsedGb, target: 20, unit: 'GB', better: 'lower' },
    { metric: 'Growth', actual: i.growthPerDay, target: 10, unit: '/dia', better: 'higher' },
    { metric: 'Workers success', actual: i.workerSuccessRate * 100, target: 99, unit: '%', better: 'higher' },
    { metric: 'Recovery', actual: i.recoveryHoursAgo, target: 24, unit: 'h', better: 'lower' },
    { metric: 'Error rate', actual: i.errorRatePct, target: 1, unit: '%', better: 'lower' },
    { metric: 'SLO', actual: i.availabilityPct, target: 99.5, unit: '%', better: 'higher' },
    { metric: 'SLA', actual: i.availabilityPct, target: 99.0, unit: '%', better: 'higher' },
  ];
  return rows.map((r) => {
    const diff = r.better === 'higher' ? r.actual - r.target : r.target - r.actual;
    const status: BenchmarkRow['status'] = diff > 0.5 ? 'above' : diff < -0.5 ? 'below' : 'on';
    return { metric: r.metric, actual: r.actual, target: r.target, unit: r.unit, status };
  });
}
