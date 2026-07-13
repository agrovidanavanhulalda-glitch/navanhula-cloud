/**
 * Sprint 2.7 · Incident Engine (client-side, in-memory, read-only source).
 * Derives incidents from Health snapshots. Never writes to production data.
 */
import { HealthSnapshot, ServiceSnapshot } from './healthEngine';
import { SloStatus } from './slo';

export type IncidentSeverity = 'SEV1' | 'SEV2' | 'SEV3';
export type IncidentStatus = 'OPEN' | 'MITIGATED' | 'RESOLVED';

export interface Incident {
  id: string;
  severity: IncidentSeverity;
  service: ServiceSnapshot['service'];
  started_at: number;
  ended_at: number | null;
  duration_ms: number | null;
  root_cause: string;
  status: IncidentStatus;
  resolution: string | null;
  source: 'telemetry' | 'worker' | 'cron' | 'storage' | 'rpc' | 'realtime' | 'database' | 'queue';
}

const severityFor = (status: SloStatus): IncidentSeverity =>
  status === 'CRITICAL' ? 'SEV1' : status === 'WARNING' ? 'SEV2' : 'SEV3';

function makeId(service: string, startedAt: number): string {
  return `inc_${service}_${startedAt.toString(36)}`;
}

/**
 * Reconcile active incidents against a fresh health snapshot.
 * Pure — returns the next incident list without mutating the input.
 */
export function reconcileIncidents(
  active: Incident[],
  snapshot: HealthSnapshot,
  now: number = Date.now()
): Incident[] {
  const next: Incident[] = active.map(i => ({ ...i }));
  const byService = new Map(next.map(i => [i.service, i] as const));

  for (const svc of snapshot.services) {
    const existing = byService.get(svc.service);
    if (svc.status === 'HEALTHY' || svc.status === 'UNKNOWN') {
      if (existing && existing.status === 'OPEN') {
        existing.status = 'RESOLVED';
        existing.ended_at = now;
        existing.duration_ms = now - existing.started_at;
        existing.resolution = 'Auto-resolved: service returned to HEALTHY';
      }
      continue;
    }
    // WARNING or CRITICAL → open or update
    if (!existing || existing.status === 'RESOLVED') {
      const failing = svc.slos.filter(s => s.status !== 'HEALTHY').map(s => s.id).join(', ');
      const inc: Incident = {
        id: makeId(svc.service, now),
        severity: severityFor(svc.status),
        service: svc.service,
        started_at: now,
        ended_at: null,
        duration_ms: null,
        root_cause: `SLO breach on ${svc.service}: ${failing || 'unknown'}`,
        status: 'OPEN',
        resolution: null,
        source: svc.service === 'queue' ? 'queue' : (svc.service as Incident['source']),
      };
      next.push(inc);
    } else {
      existing.severity = severityFor(svc.status);
    }
  }
  return next;
}

export function summarize(incidents: Incident[]) {
  const open = incidents.filter(i => i.status === 'OPEN');
  return {
    total: incidents.length,
    open: open.length,
    sev1: open.filter(i => i.severity === 'SEV1').length,
    sev2: open.filter(i => i.severity === 'SEV2').length,
    sev3: open.filter(i => i.severity === 'SEV3').length,
  };
}
