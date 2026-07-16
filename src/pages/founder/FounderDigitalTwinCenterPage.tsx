import React from 'react';
import { Badge } from '@/components/ui/badge';
import LiveSourceBadge, { type LiveSource } from '@/components/founder/LiveSourceBadge';
import { useLiveOpsMetrics, type LiveOpsSnapshot } from '@/lib/ops/useLiveOpsMetrics';
import { useLiveEnterpriseMetrics, type EnterpriseLiveSnapshot } from '@/lib/ops/useLiveEnterpriseMetrics';
import { useStorageMetrics, type StorageSnapshot } from '@/lib/ops/useStorageMetrics';
import { computeDigitalTwin, type DigitalTwinInput } from '@/lib/agentic/digital-twin/digitalTwinEngine';

/**
 * Sprint 5.5 · Founder Enterprise Digital Twin Center (read-only, consultive).
 * No writes, no persistence, no side effects, no new queries. Founder-only.
 * Uses only the existing operational hooks required by Sprint 5.5.
 */
const STORAGE_REFERENCE_BYTES = 20 * 1024 ** 3;

const finite = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const clamp = (value: unknown, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, finite(value, min)));

const pct = (value: number, reference: number): number =>
  reference > 0 ? clamp((value / reference) * 100) : 0;

const sourceRank: Record<LiveSource, number> = { live: 2, degraded: 1, offline: 0 };

function combineSource(sources: LiveSource[]): LiveSource {
  return sources.reduce<LiveSource>(
    (current, next) => (sourceRank[next] < sourceRank[current] ? next : current),
    'live',
  );
}

function sourceHealth(source: LiveSource | undefined): number {
  if (source === 'live') return 98;
  if (source === 'degraded') return 72;
  return 45;
}

function sourceReliability(source: LiveSource | undefined): number {
  if (source === 'live') return 99;
  if (source === 'degraded') return 86;
  return 65;
}

function buildDigitalTwinInput(
  live?: LiveOpsSnapshot,
  enterprise?: EnterpriseLiveSnapshot,
  storage?: StorageSnapshot | null,
): DigitalTwinInput {
  const counts = enterprise?.counts;
  const perDay = enterprise?.perDay;
  const queue = live?.queue;
  const rpc = live?.rpc;
  const storageBytes = finite(storage?.totals.bytes);
  const storageGrowth = finite(storage?.forecast.dailyBytes);
  const storageLoad = pct(storageBytes, STORAGE_REFERENCE_BYTES);
  const storageGrowthLoad = pct(storageGrowth, STORAGE_REFERENCE_BYTES / 30);
  const salesLoad = pct(finite(counts?.salesToday), Math.max(1, finite(perDay?.sales) * 2));
  const fiscalLoad = pct(finite(counts?.fiscalDocs30d), Math.max(1, finite(counts?.sales30d)));
  const queueLoad = clamp(finite(queue?.depth) / 10);
  const rpcLoad = clamp(finite(rpc?.p95) / 25);
  const telemetryLoad = pct(finite(counts?.telemetryEvents24h), Math.max(100, finite(perDay?.telemetry) * 2));
  const userLoad = pct(finite(counts?.users), Math.max(10, finite(counts?.companies) * 25));
  const rpcHealth = clamp(100 - finite(rpc?.errorRate) * 100 - finite(rpc?.timeoutRate) * 100);
  const workerHealth = clamp((queue?.successRate ?? 1) * 100 - finite(queue?.dlq) * 3);
  const enterpriseHealth = sourceHealth(enterprise?.source);
  const storageHealth = sourceHealth(storage?.source);
  const liveHealth = sourceHealth(live?.source);
  const growthPerDay = clamp(
    Math.max(
      pct(finite(perDay?.sales), Math.max(1, finite(counts?.sales30d))) * 2,
      storageGrowthLoad / 10,
      queueLoad / 25,
    ),
    0,
    5,
  );

  return {
    processes: [
      {
        id: 'pos',
        name: 'POS',
        criticality: 100,
        revenueImpact: 100,
        load: clamp(Math.max(salesLoad, rpcLoad * 0.8)),
        health: clamp((enterpriseHealth + rpcHealth + workerHealth) / 3),
        dependsOn: ['database', 'auth', 'workers'],
      },
      {
        id: 'fiscal',
        name: 'Fiscal',
        criticality: 95,
        revenueImpact: 85,
        load: clamp(Math.max(fiscalLoad, telemetryLoad * 0.7)),
        health: clamp((enterpriseHealth + workerHealth) / 2),
        dependsOn: ['database', 'storage', 'workers'],
      },
      {
        id: 'billing',
        name: 'Billing',
        criticality: 90,
        revenueImpact: 95,
        load: clamp(Math.max(salesLoad * 0.8, queueLoad)),
        health: clamp((enterpriseHealth + workerHealth + rpcHealth) / 3),
        dependsOn: ['database', 'workers'],
      },
      {
        id: 'crm',
        name: 'CRM',
        criticality: 60,
        revenueImpact: 45,
        load: clamp(userLoad),
        health: clamp((enterpriseHealth + liveHealth) / 2),
        dependsOn: ['database', 'auth'],
      },
      {
        id: 'storage-governance',
        name: 'Storage Governance',
        criticality: 70,
        revenueImpact: 55,
        load: clamp(Math.max(storageLoad, storageGrowthLoad)),
        health: storageHealth,
        dependsOn: ['storage'],
      },
    ],
    resources: [
      { id: 'database', name: 'Operational Database', kind: 'DB', used: clamp(Math.max(salesLoad, fiscalLoad)), capacity: 100 },
      { id: 'storage', name: 'Storage', kind: 'STORAGE', used: clamp(storageLoad), capacity: 100 },
      { id: 'workers', name: 'Workers', kind: 'QUEUE', used: clamp(queueLoad), capacity: 100 },
      { id: 'api', name: 'API/RPC', kind: 'NETWORK', used: clamp(rpcLoad), capacity: 100 },
      { id: 'telemetry', name: 'Telemetry', kind: 'OTHER', used: clamp(telemetryLoad), capacity: 100 },
    ],
    dependencies: [
      { id: 'database', name: 'Operational Database', type: 'INFRA', reliability: sourceReliability(enterprise?.source), criticality: 100 },
      { id: 'auth', name: 'Auth', type: 'INFRA', reliability: sourceReliability(enterprise?.source), criticality: 95 },
      { id: 'storage', name: 'Storage', type: 'INFRA', reliability: sourceReliability(storage?.source), criticality: 80 },
      { id: 'workers', name: 'Workers', type: 'INFRA', reliability: workerHealth, criticality: 90 },
      { id: 'api', name: 'API/RPC', type: 'INTERNAL', reliability: rpcHealth, criticality: 85 },
    ],
    services: [
      { id: 'app', name: 'Application', uptime: enterpriseHealth, slaTarget: 99 },
      { id: 'api', name: 'API/RPC', uptime: rpcHealth, slaTarget: 99 },
      { id: 'workers', name: 'Workers', uptime: workerHealth, slaTarget: 98 },
      { id: 'storage', name: 'Storage', uptime: storageHealth, slaTarget: 99 },
    ],
    growthPerDay,
    scenarios: [
      { id: 'peak-load', name: 'Peak Load Replay', loadDelta: Math.max(15, growthPerDay * 8), healthDelta: -5 },
      { id: 'storage-pressure', name: 'Storage Pressure Replay', loadDelta: storageGrowthLoad, healthDelta: storageLoad >= 80 ? -15 : -5, failedDependencies: storageLoad >= 95 ? ['storage'] : [] },
      { id: 'worker-degradation', name: 'Worker Degradation Replay', loadDelta: queueLoad / 2, healthDelta: workerHealth < 80 ? -20 : -8, failedDependencies: workerHealth < 60 ? ['workers'] : [] },
      { id: 'rpc-latency', name: 'RPC Latency Replay', loadDelta: rpcLoad / 2, healthDelta: rpcHealth < 80 ? -18 : -6, failedDependencies: rpcHealth < 60 ? ['api'] : [] },
    ],
    proposedChanges: [
      { id: 'scale-workers', name: 'Scale Workers', affectedProcessIds: ['pos', 'billing', 'fiscal'], loadDelta: -10, healthDelta: 8 },
      { id: 'storage-retention-review', name: 'Storage Retention Review', affectedProcessIds: ['storage-governance', 'fiscal'], loadDelta: -8, healthDelta: 6 },
      { id: 'database-optimization', name: 'Database Optimization', affectedProcessIds: ['pos', 'fiscal', 'billing', 'crm'], loadDelta: -12, healthDelta: 5 },
    ],
    timeline: [
      { id: 'enterprise-source', ts: enterprise?.fetchedAt ?? 0, kind: enterprise?.source ?? 'offline', severity: 100 - enterpriseHealth, message: `Enterprise metrics: ${enterprise?.source ?? 'offline'}` },
      { id: 'ops-source', ts: live?.fetchedAt ?? 0, kind: live?.source ?? 'offline', severity: 100 - liveHealth, message: live?.message ?? `Ops metrics: ${live?.source ?? 'offline'}` },
      { id: 'storage-source', ts: storage?.fetchedAt ?? 0, kind: storage?.source ?? 'offline', severity: 100 - storageHealth, message: `Storage metrics: ${storage?.source ?? 'offline'}` },
    ],
  };
}

const Metric: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="rounded-xl border border-border/60 bg-card/50 p-4">
    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
    {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
    <h2 className="mb-3 text-lg font-bold text-foreground">{title}</h2>
    {children}
  </section>
);

export const FounderDigitalTwinCenterPage: React.FC = () => {
  const live = useLiveOpsMetrics();
  const enterprise = useLiveEnterpriseMetrics();
  const storage = useStorageMetrics();
  const source = combineSource([
    (live.data?.source ?? 'offline') as LiveSource,
    enterprise.data?.source ?? 'offline',
    storage.data?.source ?? 'offline',
  ]);
  const input = React.useMemo(
    () => buildDigitalTwinInput(live.data, enterprise.data, storage.data),
    [live.data, enterprise.data, storage.data],
  );
  const r = React.useMemo(() => computeDigitalTwin(input), [input]);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Enterprise Digital Twin</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Representação virtual da empresa. 100% consultiva, somente leitura.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <LiveSourceBadge source={source} fetchedAt={enterprise.data?.fetchedAt} />
            <Badge variant="outline">Hooks existentes · sem nova consulta</Badge>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Digital Twin Score" value={`${r.score.total}/100`} hint={`Grade ${r.score.grade} · ${r.score.status}`} />
        <Metric label="Health Now" value={`${r.health.now}/100`} hint={`Tendência ${r.health.trend}`} />
        <Metric label="Capacidade" value={`${r.capacity.utilization}%`} hint={r.capacity.rating} />
        <Metric label="Bottlenecks" value={r.bottlenecks.count} />
        <Metric label="Deps High Risk" value={r.dependencies.highRiskCount} />
        <Metric label="Worst Failure Impact" value={r.failure.worstCaseRevenueImpact} />
        <Metric label="Estado atual" value={r.currentState.status} hint={`load ${r.currentState.averageLoad}%`} />
        <Metric label="Projeção 30d" value={r.projectedState.status} hint={`load ${r.projectedState.averageLoad}%`} />
      </div>

      <Section title="Executive Summary">
        <div className="text-sm font-semibold text-foreground">{r.summary.headline}</div>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {r.summary.bullets.map((b) => (<li key={b}>• {b}</li>))}
        </ul>
      </Section>

      <Section title="Current Enterprise State">
        <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <div>Estado: <span className="font-semibold text-foreground">{r.currentState.status}</span></div>
          <div>Load médio: <span className="font-semibold text-foreground">{r.currentState.averageLoad}%</span></div>
          <div>Saúde média: <span className="font-semibold text-foreground">{r.currentState.averageHealth}/100</span></div>
        </div>
      </Section>

      <Section title="Projected State">
        <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <div>Horizonte: <span className="font-semibold text-foreground">{r.projectedState.horizonDays} dias</span></div>
          <div>Load projetado: <span className="font-semibold text-foreground">{r.projectedState.averageLoad}%</span></div>
          <div>Estado projetado: <span className="font-semibold text-foreground">{r.projectedState.status}</span></div>
        </div>
      </Section>

      <Section title="Health Projection">
        <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-4">
          <div>Agora: <span className="font-semibold text-foreground">{r.health.now}/100</span></div>
          <div>7d: <span className="font-semibold text-foreground">{r.health.d7}/100</span></div>
          <div>30d: <span className="font-semibold text-foreground">{r.health.d30}/100</span></div>
          <div>90d: <span className="font-semibold text-foreground">{r.health.d90}/100</span></div>
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Business Mirror">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {r.businessMirror.rows.map((row) => (
              <li key={row.id}>{row.name} — score {row.score} · health {row.health}</li>
            ))}
          </ul>
        </Section>

        <Section title="Resource Mirror">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {r.resources.rows.map((row) => (
              <li key={row.id}>{row.name} ({row.kind}) — {row.utilization}% · {row.status}</li>
            ))}
          </ul>
        </Section>

        <Section title="Dependency Graph">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {r.dependencies.nodes.map((n) => (
              <li key={n.id}>{n.name} — fanIn {n.fanIn} · risco {n.riskScore}</li>
            ))}
          </ul>
        </Section>

        <Section title="Bottlenecks">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {r.bottlenecks.rows.map((b) => (
              <li key={`${b.kind}-${b.id}`}>{b.name} ({b.kind}) — pressão {b.pressure}</li>
            ))}
            {r.bottlenecks.rows.length === 0 && <li>Nenhum gargalo previsto.</li>}
          </ul>
        </Section>

        <Section title="Failure Propagation">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {r.failure.rows.map((f) => (
              <li key={f.dependencyId}>
                {f.dependencyName} → {f.affectedProcesses.join(', ') || '—'} · exposição {f.revenueImpact}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Scenario Replay">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {r.scenarios.runs.map((s) => (
              <li key={s.id}>{s.name} — {s.outcome} · load {s.averageLoad} · health {s.averageHealth}</li>
            ))}
          </ul>
        </Section>

        <Section title="Timeline Replay">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {r.timeline.events.map((e) => (
              <li key={e.id}>
                {e.ts > 0 ? new Date(e.ts).toLocaleString('pt-PT') : 'Sem timestamp'} — {e.kind} (sev {e.severity}) {e.message}
              </li>
            ))}
            {r.timeline.events.length === 0 && <li>Sem eventos.</li>}
          </ul>
        </Section>

        <Section title="Change Impact Projection">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {r.changeImpact.rows.map((c) => (
              <li key={c.id}>{c.name} — {c.risk} · afeta {c.affected} processos · exposição {c.revenueExposure}</li>
            ))}
            {r.changeImpact.rows.length === 0 && <li>Nenhuma mudança proposta.</li>}
          </ul>
        </Section>
      </div>
    </div>
  );
};

export default FounderDigitalTwinCenterPage;
