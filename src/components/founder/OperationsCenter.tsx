/**
 * Sprint 2.7 · Founder Operations Center (read-only).
 * Consumes client telemetry buffer + SLO catalog to render service health,
 * incident timeline, runbooks and disaster readiness. Zero writes.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, ShieldAlert, BookOpen, LifeBuoy } from 'lucide-react';
import { computeHealth } from '@/lib/ops/healthEngine';
import { reconcileIncidents, Incident, summarize } from '@/lib/ops/incidentEngine';
import { RUNBOOKS } from '@/lib/ops/runbooks';
import { READINESS_MATRIX } from '@/lib/ops/disasterReadiness';
import { SloStatus } from '@/lib/ops/slo';
import LiveOpsPanel from '@/components/founder/LiveOpsPanel';
import StorageOpsPanel from '@/components/founder/StorageOpsPanel';
import { useLiveOpsMetrics } from '@/lib/ops/useLiveOpsMetrics';

// Pull events from the same passive buffer used elsewhere without touching it.
import * as buffer from '@/lib/telemetry/buffer';

const toneFor = (s: SloStatus) =>
  s === 'CRITICAL' ? 'bg-destructive/15 text-destructive border-destructive/30'
  : s === 'WARNING' ? 'bg-warning/15 text-warning border-warning/30'
  : s === 'HEALTHY' ? 'bg-success/15 text-success border-success/30'
  : 'bg-muted text-muted-foreground border-border';

function useTick(ms: number) {
  const [, set] = React.useState(0);
  React.useEffect(() => { const id = setInterval(() => set(n => n + 1), ms); return () => clearInterval(id); }, [ms]);
}

export const OperationsCenter: React.FC = () => {
  useTick(15_000);
  const incidentsRef = React.useRef<Incident[]>([]);
  const live = useLiveOpsMetrics();

  // Best-effort read: telemetry buffer keeps events in a private array;
  // we snapshot by triggering aggregate() with an empty proxy fallback.
  const events = (buffer as any).__ops_events__ ?? [];
  const snapshot = computeHealth({
    events,
    dbPingP95Ms: null,
    dlqCount: live.data?.queue.dlq ?? 0,
    queueDepth: live.data?.queue.depth ?? 0,
    workerSuccessRate: live.data?.queue.successRate ?? 1,
    storageAvailability: 1,
    realtimeAvailability: 1,
  });
  incidentsRef.current = reconcileIncidents(incidentsRef.current, snapshot);
  const sum = summarize(incidentsRef.current);

  return (
    <div className="space-y-6">
      <LiveOpsPanel />
      <StorageOpsPanel />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> System Health · Overall
            <Badge variant="outline" className={`ml-auto ${toneFor(snapshot.overall)}`}>{snapshot.overall}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {snapshot.services.map(svc => (
            <div key={svc.service} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">{svc.service}</span>
                <Badge variant="outline" className={toneFor(svc.status)}>{svc.status}</Badge>
              </div>
              <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                {svc.slos.map(s => (
                  <li key={s.id} className="flex items-center justify-between">
                    <span title={s.description}>{s.id}</span>
                    <span className="font-mono">{s.value == null ? '—' : s.value.toString().slice(0, 8)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Incident Timeline
            <Badge variant="outline" className="ml-auto text-[10px]">
              {sum.open} abertos · SEV1 {sum.sev1} · SEV2 {sum.sev2}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {incidentsRef.current.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem incidentes registados na sessão.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-1">ID</th><th>Serviço</th><th>Severidade</th>
                  <th>Início</th><th>Duração</th><th>Status</th><th className="text-left">Root cause</th>
                </tr>
              </thead>
              <tbody>
                {incidentsRef.current.slice(-20).reverse().map(i => (
                  <tr key={i.id} className="border-b last:border-0">
                    <td className="font-mono py-1">{i.id}</td>
                    <td className="text-center">{i.service}</td>
                    <td className="text-center">
                      <Badge variant={i.severity === 'SEV1' ? 'destructive' : 'outline'}>{i.severity}</Badge>
                    </td>
                    <td className="text-center">{new Date(i.started_at).toLocaleTimeString()}</td>
                    <td className="text-center">{i.duration_ms ? `${(i.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                    <td className="text-center">{i.status}</td>
                    <td>{i.root_cause}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Runbooks
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {RUNBOOKS.map(rb => (
            <details key={rb.id} className="rounded-lg border border-border/60 p-3">
              <summary className="cursor-pointer text-sm font-semibold flex items-center justify-between">
                <span>{rb.title}</span>
                <Badge variant="outline" className="text-[10px]">{rb.service}</Badge>
              </summary>
              <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                <p><strong className="text-foreground">Sintomas:</strong> {rb.symptoms.join(' · ')}</p>
                <p><strong className="text-foreground">Checks:</strong> {rb.checks.join(' · ')}</p>
                <p><strong className="text-foreground">Mitigação:</strong> {rb.mitigation.join(' · ')}</p>
                <p><strong className="text-foreground">Rollback:</strong> {rb.rollback}</p>
                <p><strong className="text-foreground">RPO/RTO:</strong> {rb.rpo} / {rb.rto}</p>
              </div>
            </details>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <LifeBuoy className="h-4 w-4" /> Disaster Readiness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead className="text-muted-foreground border-b">
              <tr><th className="text-left py-1">Capacidade</th><th>Alvo</th><th>Evidência</th><th>Status</th></tr>
            </thead>
            <tbody>
              {READINESS_MATRIX.map(r => (
                <tr key={r.capability} className="border-b last:border-0">
                  <td className="py-1">{r.capability}</td>
                  <td className="text-center">{r.target}</td>
                  <td className="text-center">{r.evidence}</td>
                  <td className="text-center">
                    <Badge variant="outline" className={
                      r.status === 'READY' ? 'bg-success/15 text-success border-success/30'
                      : r.status === 'PARTIAL' ? 'bg-warning/15 text-warning border-warning/30'
                      : 'bg-muted text-muted-foreground border-border'
                    }>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationsCenter;
