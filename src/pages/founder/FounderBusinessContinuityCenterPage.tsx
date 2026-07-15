import React from 'react';
import { computeBusinessContinuity } from '@/lib/agentic/business-continuity/businessContinuityEngine';

/**
 * Sprint 5.4 · Founder Business Continuity Center (read-only, consultive).
 * No writes, no persistence, no side effects. Founder-only.
 */
const DEMO = computeBusinessContinuity({
  processes: [
    { id: 'pos', name: 'POS', criticality: 100, revenueImpact: 100, customerImpact: 90, regulatoryImpact: 70, maxToleratedDowntimeHours: 1 },
    { id: 'fiscal', name: 'Fiscal Pipeline', criticality: 95, revenueImpact: 80, customerImpact: 60, regulatoryImpact: 100, maxToleratedDowntimeHours: 4 },
    { id: 'billing', name: 'Billing', criticality: 85, revenueImpact: 95, customerImpact: 70, regulatoryImpact: 60, maxToleratedDowntimeHours: 6 },
    { id: 'crm', name: 'CRM', criticality: 45, revenueImpact: 30, customerImpact: 50, regulatoryImpact: 10, maxToleratedDowntimeHours: 24 },
    { id: 'reports', name: 'Reports', criticality: 30, revenueImpact: 10, customerImpact: 20, regulatoryImpact: 15, maxToleratedDowntimeHours: 48 },
  ],
  dependencies: [
    { id: 'db', name: 'Managed Postgres', type: 'INFRASTRUCTURE', criticality: 100, reliability: 99 },
    { id: 'auth', name: 'Auth', type: 'INFRASTRUCTURE', criticality: 95, reliability: 99 },
    { id: 'mpesa', name: 'M-Pesa Gateway', type: 'EXTERNAL', criticality: 90, reliability: 92 },
    { id: 'emola', name: 'e-Mola Gateway', type: 'EXTERNAL', criticality: 80, reliability: 90 },
  ],
  services: [
    { id: 'app', name: 'App', uptime: 99.95, slaTarget: 99.9 },
    { id: 'api', name: 'API', uptime: 99.8, slaTarget: 99.9 },
    { id: 'edge', name: 'Edge Fns', uptime: 99.99, slaTarget: 99.5 },
  ],
  scenarios: [
    { id: 'region-outage', name: 'Cloud Region Outage', likelihood: 15, severity: 95, detectability: 70 },
    { id: 'db-corruption', name: 'DB Corruption', likelihood: 5, severity: 100, detectability: 40 },
    { id: 'ddos', name: 'DDoS', likelihood: 40, severity: 60, detectability: 80 },
  ],
  failovers: [
    { id: 'db', name: 'DB PITR', configured: true, tested: true, automatic: false, failoverTimeMinutes: 30 },
    { id: 'edge', name: 'Edge Failover', configured: true, tested: false, automatic: true, failoverTimeMinutes: 5 },
  ],
  backups: [
    { id: 'db-daily', name: 'DB Diário', lastBackupHoursAgo: 6, lastRestoreTestDaysAgo: 45, successRate: 100, encrypted: true, offsite: true },
    { id: 'storage', name: 'Storage Snapshot', lastBackupHoursAgo: 24, lastRestoreTestDaysAgo: 120, successRate: 98, encrypted: true, offsite: true },
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

export const FounderBusinessContinuityCenterPage: React.FC = () => {
  const r = DEMO;
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-5">
        <h1 className="text-2xl font-black tracking-tight">Business Continuity Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Camada consultiva de continuidade de negócios e inteligência para desastres. Somente leitura.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="BCM Score" value={`${r.score.total}/100`} hint={`Grade ${r.score.grade} · ${r.score.status}`} />
        <Metric label="Recovery Readiness" value={`${r.readiness.score}/100`} hint={`RTO ${r.readiness.rtoAlignment} · RPO ${r.readiness.rpoAlignment}`} />
        <Metric label="RTO médio" value={`${r.objectives.averageRtoHours} h`} />
        <Metric label="RPO médio" value={`${r.objectives.averageRpoHours} h`} />
        <Metric label="Resiliência" value={`${r.resilience.grade} · ${r.resilience.score}`} />
        <Metric label="Disponibilidade" value={`${r.availability.average}%`} hint={`${r.availability.breachCount} SLA breach(es)`} />
        <Metric label="Backups" value={`${r.backups.score}/100`} hint={`${r.backups.staleCount} desatualizado(s)`} />
        <Metric label="Failover" value={`${r.failover.score}/100`} hint={`${r.failover.untestedCount} sem teste`} />
      </div>

      <Section title="Executive Summary">
        <div className="text-sm font-semibold text-foreground">{r.summary.headline}</div>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {r.summary.bullets.map((b, i) => (<li key={i}>• {b}</li>))}
        </ul>
      </Section>

      <Section title="Critical Services (Recovery Priority)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Processo</th><th>Tier</th><th>Impact</th><th>MTD (h)</th></tr>
            </thead>
            <tbody>
              {r.critical.map((c) => (
                <tr key={c.id} className="border-t border-border/40">
                  <td className="py-2">{c.name}</td>
                  <td>{c.tier}</td>
                  <td>{c.impactScore}</td>
                  <td>{c.maxToleratedDowntimeHours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Business Impact">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {r.bia.map((b) => (
              <li key={b.id}>{b.name} — {b.tier} ({b.impactScore})</li>
            ))}
          </ul>
        </Section>
        <Section title="Disaster Readiness">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {r.scenarios.rows.map((s) => (
              <li key={s.id}>{s.name} — risco {s.risk} · severidade {s.severity}</li>
            ))}
          </ul>
        </Section>
        <Section title="Service Availability">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {r.availability.rows.map((s) => (
              <li key={s.id}>{s.name} — uptime {s.uptime}% (SLA {s.slaTarget}%){s.slaBreach ? ' · BREACH' : ''}</li>
            ))}
          </ul>
        </Section>
        <Section title="Backup & Failover Readiness">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {r.backups.rows.map((b) => (
              <li key={b.id}>Backup {b.name} — saúde {b.health}/100</li>
            ))}
            {r.failover.rows.map((f) => (
              <li key={f.id}>Failover {f.name} — prontidão {f.readiness}/100</li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
};

export default FounderBusinessContinuityCenterPage;
