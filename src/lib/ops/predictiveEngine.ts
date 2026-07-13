/**
 * Sprint 3.0 · Predictive Alerts (read-only forecasts).
 */
import type { CapacityForecast } from './capacityEngine';

export type PredictiveSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface PredictiveAlert {
  id: string;
  severity: PredictiveSeverity;
  title: string;
  eta: string;   // human-readable ETA
  detail: string;
}

/** Days until a metric hits `limit` at current growth. `null` = never / no growth. */
export function daysUntil(current: number, perDay: number, limit: number): number | null {
  if (perDay <= 0) return null;
  if (current >= limit) return 0;
  return Math.ceil((limit - current) / perDay);
}

export interface PredictiveInputs {
  db: CapacityForecast;         // in bytes
  storage: CapacityForecast;    // in bytes
  storageQuotaBytes?: number;   // optional soft limit
  dlqCurrent: number;
  dlqPerDay: number;
  dlqLimit?: number;
  workerSuccessRate: number | null;
}

export function predict(i: PredictiveInputs): PredictiveAlert[] {
  const out: PredictiveAlert[] = [];
  const DB_LIMIT = 20 * 1024 ** 3;
  const dbDays = daysUntil(i.db.current, i.db.perDay, DB_LIMIT);
  if (dbDays !== null && dbDays <= 60) {
    out.push({
      id: 'db-20gb',
      severity: dbDays <= 14 ? 'CRITICAL' : 'WARNING',
      title: 'Banco ultrapassará 20 GB',
      eta: `${dbDays} dias`,
      detail: `Projeção linear a ${(i.db.perDay / 1024 ** 2).toFixed(1)} MB/dia.`,
    });
  }
  if (i.storageQuotaBytes) {
    const threshold = i.storageQuotaBytes * 0.8;
    const stDays = daysUntil(i.storage.current, i.storage.perDay, threshold);
    if (stDays !== null && stDays <= 90) {
      out.push({
        id: 'storage-80',
        severity: stDays <= 21 ? 'CRITICAL' : 'WARNING',
        title: 'Storage atingirá 80% da quota',
        eta: `${stDays} dias`,
        detail: `Crescimento ${(i.storage.perDay / 1024 ** 3).toFixed(2)} GB/dia.`,
      });
    }
  }
  const dlqLimit = i.dlqLimit ?? 500;
  const dlqDays = daysUntil(i.dlqCurrent, i.dlqPerDay, dlqLimit);
  if (dlqDays !== null && dlqDays <= 30) {
    out.push({
      id: 'dlq-fill',
      severity: dlqDays <= 10 ? 'CRITICAL' : 'WARNING',
      title: `DLQ deve encher em ${dlqDays} dias`,
      eta: `${dlqDays} dias`,
      detail: `Atual=${i.dlqCurrent}, cresc=${i.dlqPerDay.toFixed(1)}/dia, limite=${dlqLimit}.`,
    });
  }
  if (i.workerSuccessRate !== null && i.workerSuccessRate < 0.9) {
    out.push({
      id: 'workers-saturate',
      severity: 'WARNING',
      title: 'Workers ficarão saturados',
      eta: 'iminente',
      detail: `Success rate=${(i.workerSuccessRate * 100).toFixed(1)}%.`,
    });
  }
  return out;
}
