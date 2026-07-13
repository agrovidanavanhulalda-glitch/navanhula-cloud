/**
 * Sprint 2.7 · Enterprise SLO catalog (read-only definitions).
 * Non-enforcing: pure evaluation used by the Health Engine.
 * Zero impact on POS / Billing / Fiscal / CRM / Auth / RPC contracts.
 */

export type SloStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';

export interface SloDefinition {
  id: string;
  service: 'rpc' | 'edge' | 'worker' | 'storage' | 'realtime' | 'database' | 'cron' | 'queue';
  metric: 'latency_p95_ms' | 'error_rate' | 'success_rate' | 'availability' | 'queue_depth' | 'dlq_count';
  target: number;
  warnAt: number;
  critAt: number;
  description: string;
}

export const SLOS: SloDefinition[] = [
  { id: 'rpc.p95',       service: 'rpc',      metric: 'latency_p95_ms', target: 300,  warnAt: 500,  critAt: 1000, description: 'RPC p95 latency' },
  { id: 'rpc.error',     service: 'rpc',      metric: 'error_rate',     target: 0.01, warnAt: 0.02, critAt: 0.05, description: 'RPC error rate' },
  { id: 'worker.success',service: 'worker',   metric: 'success_rate',   target: 0.99, warnAt: 0.97, critAt: 0.90, description: 'Worker success rate' },
  { id: 'queue.dlq',     service: 'queue',    metric: 'dlq_count',      target: 0,    warnAt: 1,    critAt: 10,   description: 'Dead-letter queue count' },
  { id: 'queue.depth',   service: 'queue',    metric: 'queue_depth',    target: 100,  warnAt: 250,  critAt: 1000, description: 'Background queue depth' },
  { id: 'storage.avail', service: 'storage',  metric: 'availability',   target: 0.999,warnAt: 0.99, critAt: 0.95, description: 'Storage availability' },
  { id: 'realtime.up',   service: 'realtime', metric: 'availability',   target: 0.99, warnAt: 0.98, critAt: 0.95, description: 'Realtime uptime' },
  { id: 'db.p95',        service: 'database', metric: 'latency_p95_ms', target: 400,  warnAt: 800,  critAt: 1500, description: 'Database ping p95' },
];

export function evaluate(slo: SloDefinition, value: number | null | undefined): SloStatus {
  if (value == null || Number.isNaN(value)) return 'UNKNOWN';
  const higherIsBetter = slo.metric === 'success_rate' || slo.metric === 'availability';
  if (higherIsBetter) {
    if (value >= slo.target) return 'HEALTHY';
    if (value >= slo.warnAt) return 'WARNING';
    return 'CRITICAL';
  }
  if (value <= slo.target) return 'HEALTHY';
  if (value <= slo.warnAt) return 'WARNING';
  if (value <= slo.critAt) return 'WARNING';
  return 'CRITICAL';
}

export function rollup(statuses: SloStatus[]): SloStatus {
  if (statuses.some(s => s === 'CRITICAL')) return 'CRITICAL';
  if (statuses.some(s => s === 'WARNING')) return 'WARNING';
  if (statuses.every(s => s === 'UNKNOWN')) return 'UNKNOWN';
  return 'HEALTHY';
}
