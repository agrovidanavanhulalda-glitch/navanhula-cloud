/**
 * Sprint 7.4 · Founder Support Center (read-only, deterministic).
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LifeBuoy, Sparkles, ShieldCheck, Timer, Gauge, AlertTriangle, TrendingUp, Users, BarChart3, Lightbulb,
} from 'lucide-react';
import {
  assessSupportPortfolio,
  type SupportPortfolio,
} from '@/lib/agentic/support/supportAggregator';
import type { SupportAgent, SupportTicket } from '@/lib/agentic/support/types';

const iso = (offsetMin: number) => new Date(Date.now() + offsetMin * 60_000).toISOString();

const SEED_TICKETS: SupportTicket[] = [
  { id: 's1', customerId: 'c1', customerName: 'Padaria Central', subject: 'POS não imprime',
    priority: 'P1', status: 'open', createdAt: iso(-60 * 26),
    firstResponseAt: iso(-60 * 25), resolvedAt: null,
    slaResponseMinutes: 60, slaResolutionMinutes: 480, escalations: 2, reopenCount: 0, satisfactionScore: null },
  { id: 's2', customerId: 'c2', customerName: 'Agro Zambézia', subject: 'Erro no relatório',
    priority: 'P2', status: 'pending', createdAt: iso(-60 * 8),
    firstResponseAt: iso(-60 * 7), resolvedAt: null,
    slaResponseMinutes: 120, slaResolutionMinutes: 1440, escalations: 0, reopenCount: 1, satisfactionScore: null },
  { id: 's3', customerId: 'c3', customerName: 'Retail Norte', subject: 'Dúvida fiscal',
    priority: 'P3', status: 'resolved', createdAt: '2026-06-10T09:00:00Z',
    firstResponseAt: '2026-06-10T09:30:00Z', resolvedAt: '2026-06-10T12:00:00Z',
    slaResponseMinutes: 240, slaResolutionMinutes: 1440, escalations: 0, reopenCount: 0, satisfactionScore: 5 },
  { id: 's4', customerId: 'c4', customerName: 'Avícola Beira', subject: 'Sincronização offline',
    priority: 'P2', status: 'resolved', createdAt: '2026-07-01T08:00:00Z',
    firstResponseAt: '2026-07-01T08:45:00Z', resolvedAt: '2026-07-02T10:00:00Z',
    slaResponseMinutes: 60, slaResolutionMinutes: 1440, escalations: 1, reopenCount: 0, satisfactionScore: 4 },
  { id: 's5', customerId: 'c5', customerName: 'Mercearia N.', subject: 'Instalar leitor código de barras',
    priority: 'P4', status: 'open', createdAt: iso(-60 * 2),
    firstResponseAt: iso(-60), resolvedAt: null,
    slaResponseMinutes: 240, slaResolutionMinutes: 2880, escalations: 0, reopenCount: 0, satisfactionScore: null },
];

const SEED_AGENTS: SupportAgent[] = [
  { id: 'a1', name: 'Ana', capacityHoursPerWeek: 40, activeTickets: 3 },
  { id: 'a2', name: 'Bruno', capacityHoursPerWeek: 40, activeTickets: 2 },
];

const ratingTone = (r: string) =>
  r === 'CHAMPION' || r === 'HEALTHY' ? 'bg-success/15 text-success border-success/30'
  : r === 'STABLE' ? 'bg-muted text-muted-foreground border-border'
  : r === 'AT_RISK' ? 'bg-warning/15 text-warning border-warning/30'
  : 'bg-destructive/15 text-destructive border-destructive/30';

const capTone = (b: string) =>
  b === 'OVERLOAD' ? 'bg-destructive/15 text-destructive border-destructive/30'
  : b === 'HIGH' ? 'bg-warning/15 text-warning border-warning/30'
  : b === 'OK' ? 'bg-success/15 text-success border-success/30'
  : 'bg-muted text-muted-foreground border-border';

const fmtMin = (m: number) => m < 60 ? `${m} min` : `${(m / 60).toFixed(1)} h`;

export const FounderSupportCenterPage: React.FC = () => {
  const p: SupportPortfolio = React.useMemo(
    () => assessSupportPortfolio(SEED_TICKETS, SEED_AGENTS),
    [],
  );

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Support Intelligence & SLA Center</h1>
            <p className="text-xs text-muted-foreground">
              SLA, capacidade, backlog e qualidade do suporte. Consultivo, read-only.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Sparkles className="h-4 w-4" />} label="Support Score" value={`${p.score.score}/100`} />
        <Kpi icon={<ShieldCheck className="h-4 w-4" />} label="SLA Compliance" value={`${p.sla.overallCompliancePct}%`} />
        <Kpi icon={<Timer className="h-4 w-4" />} label="Avg Response" value={fmtMin(p.responseTime.avgMinutes)} />
        <Kpi icon={<Timer className="h-4 w-4" />} label="Avg Resolution" value={fmtMin(p.resolutionTime.avgMinutes)} />
        <Kpi icon={<BarChart3 className="h-4 w-4" />} label="Backlog" value={`${p.backlog.openCount} (${p.backlog.agedOverDays} envelhecidos)`} />
        <Kpi icon={<AlertTriangle className="h-4 w-4" />} label="Tickets Críticos" value={String(p.critical.length)} tone="warning" />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Escalações" value={`${p.escalations.escalatedTickets} (${p.escalations.escalationRatePct}%)`} />
        <Kpi icon={<Users className="h-4 w-4" />} label="Capacity" value={`${p.capacity.utilizationPct}%`} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Executive Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium">{p.summary.headline}</p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            {p.summary.highlights.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Gauge className="h-4 w-4" /> Queue Health</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Score">
              <Badge variant="outline" className={ratingTone(p.queue.band)}>{p.queue.score}/100</Badge>
            </Row>
            <Row label="Risco Operacional">{p.queue.risk}</Row>
            <Row label="Response p90">{fmtMin(p.responseTime.p90Minutes)}</Row>
            <Row label="Resolution p90">{fmtMin(p.resolutionTime.p90Minutes)}</Row>
            <Row label="Não respondidos">{p.responseTime.unanswered}</Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Capacity</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Agentes">{p.capacity.totalAgents}</Row>
            <Row label="Horas/semana">{p.capacity.totalCapacityHours}</Row>
            <Row label="Utilização">
              <Badge variant="outline" className={capTone(p.capacity.band)}>{p.capacity.utilizationPct}% · {p.capacity.band}</Badge>
            </Row>
            <Row label="Tickets abertos">{p.capacity.openTickets}</Row>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Tickets Críticos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {p.critical.length === 0 && <p className="text-sm text-muted-foreground">Sem tickets críticos abertos.</p>}
          {p.critical.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
              <div>
                <div className="font-medium">{c.customerName}</div>
                <div className="text-xs text-muted-foreground">{c.subject}</div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">P1</Badge>
                <span className="text-muted-foreground">{c.ageHours}h · esc {c.escalations}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Tendência de Tickets</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Direção">{p.trend.direction}</Row>
          {p.trend.buckets.map((b) => (
            <Row key={b.month} label={b.month}>{b.count}</Row>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string; tone?: 'warning' | 'success' }> = ({
  icon, label, value, tone,
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className={`mt-1 text-xl font-bold ${tone === 'warning' ? 'text-warning' : tone === 'success' ? 'text-success' : ''}`}>{value}</div>
    </CardContent>
  </Card>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{children}</span>
  </div>
);

export default FounderSupportCenterPage;
