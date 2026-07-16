import React from 'react';
import { computeDigitalTwin } from '@/lib/agentic/digital-twin/digitalTwinEngine';

/**
 * Sprint 5.5 · Founder Enterprise Digital Twin Center (read-only, consultive).
 * No writes, no persistence, no side effects, no new queries. Founder-only.
 */
const DEMO = computeDigitalTwin({
  processes: [
    { id: 'pos', name: 'POS', criticality: 100, revenueImpact: 100, load: 70, health: 88, dependsOn: ['db', 'auth'] },
    { id: 'fiscal', name: 'Fiscal', criticality: 95, revenueImpact: 80, load: 55, health: 82, dependsOn: ['db'] },
    { id: 'billing', name: 'Billing', criticality: 85, revenueImpact: 95, load: 40, health: 90, dependsOn: ['db', 'mpesa'] },
    { id: 'crm', name: 'CRM', criticality: 45, revenueImpact: 30, load: 30, health: 92, dependsOn: ['db'] },
  ],
  resources: [
    { id: 'db', name: 'Postgres', kind: 'DB', used: 62, capacity: 100 },
    { id: 'edge', name: 'Edge CPU', kind: 'CPU', used: 40, capacity: 100 },
    { id: 'store', name: 'Storage', kind: 'STORAGE', used: 78, capacity: 100 },
  ],
  dependencies: [
    { id: 'db', name: 'Postgres', type: 'INFRA', reliability: 99, criticality: 100 },
    { id: 'auth', name: 'Auth', type: 'INFRA', reliability: 99, criticality: 95 },
    { id: 'mpesa', name: 'M-Pesa', type: 'EXTERNAL', reliability: 92, criticality: 85 },
  ],
  services: [
    { id: 'app', name: 'App', uptime: 99.95, slaTarget: 99.9 },
    { id: 'api', name: 'API', uptime: 99.8, slaTarget: 99.9 },
  ],
  growthPerDay: 0.4,
  scenarios: [
    { id: 'db-down', name: 'DB Outage', healthDelta: -40, failedDependencies: ['db'] },
    { id: 'peak', name: 'Peak Load', loadDelta: 25 },
  ],
  proposedChanges: [
    { id: 'migrate-db', name: 'Migrar Postgres', affectedProcessIds: ['pos', 'fiscal'], loadDelta: 10, healthDelta: -5 },
  ],
  timeline: [
    { id: 'e1', ts: Date.now() - 3_600_000, kind: 'incident', severity: 60, message: 'Latência elevada em POS' },
    { id: 'e2', ts: Date.now() - 60_000, kind: 'recovery', severity: 10, message: 'POS restabelecido' },
  ],
});

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
  const r = DEMO;
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-5">
        <h1 className="text-2xl font-black tracking-tight">Enterprise Digital Twin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Representação virtual da empresa. 100% consultiva, somente leitura.
        </p>
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
          {r.summary.bullets.map((b, i) => (<li key={i}>• {b}</li>))}
        </ul>
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
                {new Date(e.ts).toLocaleString()} — {e.kind} (sev {e.severity}) {e.message}
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
