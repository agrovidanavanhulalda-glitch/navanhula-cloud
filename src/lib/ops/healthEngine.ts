/**
 * Sprint 2.7 · Enterprise Health Engine (client-side, read-only).
 * Aggregates passive telemetry + SLO catalog into service health snapshots.
 * Pure functions: no network, no side-effects, no writes.
 */
import { SLOS, SloStatus, SloDefinition, evaluate, rollup } from './slo';
import { TelemetryEvent, aggregate } from '@/lib/telemetry/buffer';

export interface ServiceSnapshot {
  service: SloDefinition['service'];
  status: SloStatus;
  slos: Array<{ id: string; value: number | null; status: SloStatus; target: number; warnAt: number; critAt: number; description: string }>;
  sampleSize: number;
}

export interface HealthSnapshot {
  overall: SloStatus;
  services: ServiceSnapshot[];
  generatedAt: number;
}

export interface HealthInputs {
  events: TelemetryEvent[];
  dbPingP95Ms?: number | null;
  dlqCount?: number | null;
  queueDepth?: number | null;
  workerSuccessRate?: number | null;
  storageAvailability?: number | null;
  realtimeAvailability?: number | null;
}

/** Percentile of a numeric array (unsorted input allowed). */
function pct(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

export function computeHealth(inputs: HealthInputs): HealthSnapshot {
  const { events } = inputs;
  const rpcEvents = events.filter(e => e.kind === 'rpc');
  const rpcDurs = rpcEvents.map(e => e.duration_ms);
  const rpcErrors = rpcEvents.filter(e => !e.success).length;
  const rpcErrorRate = rpcEvents.length ? rpcErrors / rpcEvents.length : null;
  const rpcP95 = pct(rpcDurs, 95);

  const metricValues: Record<string, number | null | undefined> = {
    'rpc.p95': rpcP95,
    'rpc.error': rpcErrorRate,
    'worker.success': inputs.workerSuccessRate,
    'queue.dlq': inputs.dlqCount,
    'queue.depth': inputs.queueDepth,
    'storage.avail': inputs.storageAvailability,
    'realtime.up': inputs.realtimeAvailability,
    'db.p95': inputs.dbPingP95Ms,
  };

  const byService = new Map<SloDefinition['service'], ServiceSnapshot>();
  for (const slo of SLOS) {
    const value = metricValues[slo.id];
    const status = evaluate(slo, value ?? null);
    const svc = byService.get(slo.service) ?? {
      service: slo.service,
      status: 'UNKNOWN' as SloStatus,
      slos: [],
      sampleSize: slo.service === 'rpc' ? rpcEvents.length : 0,
    };
    svc.slos.push({
      id: slo.id,
      value: value ?? null,
      status,
      target: slo.target,
      warnAt: slo.warnAt,
      critAt: slo.critAt,
      description: slo.description,
    });
    byService.set(slo.service, svc);
  }
  const services = [...byService.values()].map(s => ({ ...s, status: rollup(s.slos.map(x => x.status)) }));
  const overall = rollup(services.map(s => s.status));
  return { overall, services, generatedAt: Date.now() };
}

// Convenience re-exports for consumers building dashboards.
export { aggregate };
