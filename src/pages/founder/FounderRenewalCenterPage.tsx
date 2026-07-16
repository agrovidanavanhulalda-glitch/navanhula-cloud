/**
 * Sprint 7.3 · Founder Renewal Center (read-only, deterministic).
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCcw, TrendingUp, ShieldAlert, Sparkles, AlertTriangle, Trophy, BarChart3, Lightbulb,
} from 'lucide-react';
import {
  assessRenewalPortfolio,
  type RenewalPortfolio,
} from '@/lib/agentic/renewal/renewalAggregator';
import type { RenewalContract } from '@/lib/agentic/renewal/types';

const iso = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString();

const SEED: RenewalContract[] = [
  { id: 'r1', customerId: 'c1', customerName: 'Padaria Central', planTier: 'pro',
    mrr: 1500, startDate: iso(-420), renewalDate: iso(20), tenureDays: 420,
    usagePct: 82, npsScore: 60, overdueInvoices: 0, criticalTickets: 0,
    daysSinceLastLogin: 2, expansionSignals: 2 },
  { id: 'r2', customerId: 'c2', customerName: 'Agro Zambézia', planTier: 'starter',
    mrr: 750, startDate: iso(-90), renewalDate: iso(-5), tenureDays: 90,
    usagePct: 30, npsScore: -20, overdueInvoices: 2, criticalTickets: 3,
    daysSinceLastLogin: 45, expansionSignals: 0 },
  { id: 'r3', customerId: 'c3', customerName: 'Retail Norte', planTier: 'enterprise',
    mrr: 4500, startDate: iso(-600), renewalDate: iso(70), tenureDays: 600,
    usagePct: 92, npsScore: 80, overdueInvoices: 0, criticalTickets: 0,
    daysSinceLastLogin: 1, expansionSignals: 3 },
  { id: 'r4', customerId: 'c4', customerName: 'Avícola Beira', planTier: 'pro',
    mrr: 2000, startDate: iso(-200), renewalDate: iso(40), tenureDays: 200,
    usagePct: 55, npsScore: 10, overdueInvoices: 0, criticalTickets: 1,
    daysSinceLastLogin: 12, expansionSignals: 1 },
  { id: 'r5', customerId: 'c5', customerName: 'Mercearia N.', planTier: 'starter',
    mrr: 750, startDate: iso(-60), renewalDate: iso(150), tenureDays: 60,
    usagePct: 65, npsScore: 40, overdueInvoices: 0, criticalTickets: 0,
    daysSinceLastLogin: 5, expansionSignals: 0 },
];

const ratingTone = (r: string) =>
  r === 'CHAMPION' || r === 'HEALTHY' ? 'bg-success/15 text-success border-success/30'
  : r === 'STABLE' ? 'bg-muted text-muted-foreground border-border'
  : r === 'AT_RISK' ? 'bg-warning/15 text-warning border-warning/30'
  : 'bg-destructive/15 text-destructive border-destructive/30';

const prioTone = (p: string) =>
  p === 'P1' ? 'bg-destructive/15 text-destructive border-destructive/30'
  : p === 'P2' ? 'bg-warning/15 text-warning border-warning/30'
  : 'bg-muted text-muted-foreground border-border';

const fmt = (n: number) => `${n.toLocaleString('pt-PT')} MT`;

export const FounderRenewalCenterPage: React.FC = () => {
  const p: RenewalPortfolio = React.useMemo(() => assessRenewalPortfolio(SEED), []);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <RefreshCcw className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Renewal & Revenue Intelligence</h1>
            <p className="text-xs text-muted-foreground">
              Renovações, retenção contratual e previsão de receita. Consultivo, read-only.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Sparkles className="h-4 w-4" />} label="Renewal Score" value={`${p.avgScore}/100`} />
        <Kpi icon={<BarChart3 className="h-4 w-4" />} label="Contratos" value={String(p.total)} />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="MRR total" value={fmt(p.totalMrr)} />
        <Kpi icon={<ShieldAlert className="h-4 w-4" />} label="MRR em risco (30d)" value={fmt(p.forecast30d.expectedChurnedMrr)} tone="warning" />
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
          <CardHeader><CardTitle className="text-sm">Renewal Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {p.pipeline.buckets.map((b) => (
              <div key={b.stage} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{b.stage}</span>
                <span className="font-medium">{b.count} · {fmt(b.mrr)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Revenue Forecast</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[p.forecast30d, p.forecast60d, p.forecast90d].map((f) => (
              <div key={f.windowDays} className="flex items-center justify-between">
                <span className="text-muted-foreground">Janela {f.windowDays}d</span>
                <span className="font-medium">
                  Net {fmt(f.netForecastMrr)} · Churn {fmt(f.expectedChurnedMrr)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Top Renewal Risks</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {p.topRisks.length === 0 && <p className="text-sm text-muted-foreground">Sem riscos relevantes.</p>}
          {p.topRisks.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
              <div>
                <div className="font-medium">{a.customerName}</div>
                <div className="text-xs text-muted-foreground">
                  {a.planTier} · {fmt(a.mrr)} · renov. em {a.status.daysToRenewal}d
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={prioTone(a.priority.priority)}>{a.priority.priority}</Badge>
                <Badge variant="outline" className={ratingTone(a.score.rating)}>{a.score.rating}</Badge>
                <span className="text-xs text-muted-foreground">Risk {a.risk.riskScore}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-success" /> Expansion Opportunities</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {p.topOpportunities.length === 0 && <p className="text-sm text-muted-foreground">Sem oportunidades identificadas.</p>}
          {p.topOpportunities.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
              <div>
                <div className="font-medium">{a.customerName}</div>
                <div className="text-xs text-muted-foreground">{a.opportunity.reason}</div>
              </div>
              <div className="text-sm font-semibold text-success">+{fmt(a.opportunity.estimatedMrrLift)}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Top Accounts</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[...p.assessments].sort((a, b) => b.mrr - a.mrr).slice(0, 10).map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
              <div>
                <div className="font-medium">{a.customerName}</div>
                <div className="text-xs text-muted-foreground">
                  Score {a.score.score} · Prob {(a.probability.probability * 100).toFixed(0)}%
                </div>
              </div>
              <div className="text-sm font-semibold">{fmt(a.mrr)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string; tone?: 'success' | 'warning' }> = ({
  icon, label, value, tone,
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className={`mt-1 text-xl font-bold ${tone === 'warning' ? 'text-warning' : tone === 'success' ? 'text-success' : ''}`}>{value}</div>
    </CardContent>
  </Card>
);

export default FounderRenewalCenterPage;
