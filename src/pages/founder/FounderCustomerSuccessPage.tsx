/**
 * Sprint 7.0 · Founder Customer Success Center (read-only).
 * Consultive, deterministic. Consumes pure engines and existing subscription
 * data. Zero writes, zero side-effects to protected modules.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeartPulse, TrendingDown, Sparkles, Users, DollarSign, Activity } from 'lucide-react';
import {
  assessPortfolio,
  type CustomerRecord,
  type PortfolioAssessment,
} from '@/lib/agentic/customer-success/customerSuccessAggregator';

/**
 * Demo dataset — deterministic seed for the consultive dashboard while real
 * telemetry ingestion is wired in a later sprint. Values are illustrative and
 * NEVER written back to the database.
 */
const SEED: CustomerRecord[] = [
  {
    id: 'seed-1', name: 'Padaria Central LDA', planTier: 'pro',
    signals: {
      tenureDays: 210, daysSinceLastLogin: 1, onboardingCompletionPct: 100,
      featureAdoptionPct: 82, sales30d: 640, salesPrev30d: 590, fiscalDocs30d: 210,
      openTickets: 1, criticalTickets: 0, daysToRenewal: 45, hasOverdueInvoice: false, mrr: 1500,
    },
  },
  {
    id: 'seed-2', name: 'Agro Zambézia', planTier: 'starter',
    signals: {
      tenureDays: 60, daysSinceLastLogin: 22, onboardingCompletionPct: 35,
      featureAdoptionPct: 20, sales30d: 12, salesPrev30d: 40, fiscalDocs30d: 3,
      openTickets: 2, criticalTickets: 1, daysToRenewal: 5, hasOverdueInvoice: true, mrr: 750,
    },
  },
  {
    id: 'seed-3', name: 'Retail Maputo Norte', planTier: 'enterprise',
    signals: {
      tenureDays: 400, daysSinceLastLogin: 0, onboardingCompletionPct: 100,
      featureAdoptionPct: 95, sales30d: 2100, salesPrev30d: 1900, fiscalDocs30d: 890,
      openTickets: 0, criticalTickets: 0, daysToRenewal: 120, hasOverdueInvoice: false, mrr: 3500,
    },
  },
  {
    id: 'seed-4', name: 'Avícola Beira', planTier: 'starter',
    signals: {
      tenureDays: 120, daysSinceLastLogin: 40, onboardingCompletionPct: 55,
      featureAdoptionPct: 30, sales30d: 0, salesPrev30d: 30, fiscalDocs30d: 0,
      openTickets: 3, criticalTickets: 0, daysToRenewal: -5, hasOverdueInvoice: true, mrr: 750,
    },
  },
];

const ratingTone = (rating: string) =>
  rating === 'CHAMPION' ? 'bg-success/15 text-success border-success/30'
  : rating === 'HEALTHY' ? 'bg-success/10 text-success border-success/20'
  : rating === 'STABLE' ? 'bg-muted text-muted-foreground border-border'
  : rating === 'AT_RISK' ? 'bg-warning/15 text-warning border-warning/30'
  : 'bg-destructive/15 text-destructive border-destructive/30';

const churnTone = (band: string) =>
  band === 'IMMINENT' ? 'bg-destructive/15 text-destructive border-destructive/30'
  : band === 'HIGH' ? 'bg-warning/15 text-warning border-warning/30'
  : band === 'MODERATE' ? 'bg-muted text-muted-foreground border-border'
  : 'bg-success/15 text-success border-success/30';

const fmtMzn = (n: number) =>
  new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' MT';

export const FounderCustomerSuccessPage: React.FC = () => {
  const portfolio: PortfolioAssessment = React.useMemo(() => assessPortfolio(SEED), []);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Customer Success Center</h1>
            <p className="text-xs text-muted-foreground">
              Saúde, adoção, churn e expansão — consultivo, read-only.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={<Users className="h-4 w-4" />} label="Clientes ativos" value={portfolio.total.toString()} />
        <KpiCard icon={<DollarSign className="h-4 w-4" />} label="MRR total" value={fmtMzn(portfolio.totalMrr)} />
        <KpiCard icon={<Activity className="h-4 w-4" />} label="Health médio" value={`${portfolio.avgHealth}/100`} />
        <KpiCard icon={<TrendingDown className="h-4 w-4" />} label="MRR em risco" value={fmtMzn(portfolio.atRiskMrr)} tone="warning" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard icon={<Sparkles className="h-4 w-4" />} label="NRR estimada" value={`${(portfolio.nrr * 100).toFixed(0)}%`} tone="success" />
        <KpiCard icon={<Activity className="h-4 w-4" />} label="GRR estimada" value={`${(portfolio.grr * 100).toFixed(0)}%`} />
        <KpiCard icon={<Sparkles className="h-4 w-4" />} label="MRR de expansão" value={fmtMzn(portfolio.expansionMrr)} tone="success" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <HeartPulse className="h-4 w-4" /> Distribuição de Saúde
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(portfolio.distribution).map(([rating, count]) => (
            <div key={rating} className="rounded-lg border border-border/60 p-3 text-center">
              <Badge variant="outline" className={ratingTone(rating)}>{rating}</Badge>
              <div className="mt-2 text-2xl font-bold">{count}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4" /> Top Riscos de Churn (30d)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead className="text-muted-foreground border-b">
              <tr>
                <th className="text-left py-1">Cliente</th>
                <th>Plano</th><th>Health</th><th>Churn 30d</th><th>Banda</th>
                <th className="text-left">Playbook</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.topRisks.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-1.5 font-medium">{c.name}</td>
                  <td className="text-center uppercase text-muted-foreground">{c.planTier}</td>
                  <td className="text-center font-mono">{c.health.score}</td>
                  <td className="text-center font-mono">{(c.churn.probability30d * 100).toFixed(0)}%</td>
                  <td className="text-center">
                    <Badge variant="outline" className={churnTone(c.churn.band)}>{c.churn.band}</Badge>
                  </td>
                  <td className="text-muted-foreground">{c.churn.recommendedPlaybook}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Oportunidades de Expansão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {portfolio.topOpportunities.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem oportunidades detectadas na janela atual.</p>
          ) : portfolio.topOpportunities.map((c) => (
            <div key={c.id} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">{c.name}</span>
                <Badge variant="outline" className="text-[10px] uppercase">{c.planTier}</Badge>
              </div>
              <ul className="space-y-1.5">
                {c.opportunities.map((o, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="font-medium text-foreground">{o.title}</div>
                      <div className="text-muted-foreground">{o.rationale}</div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <div className="font-mono text-success">+{fmtMzn(o.estimatedMrrLift)}</div>
                      <div className="text-[10px] text-muted-foreground">confiança {o.confidence}%</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground text-center">
        Sprint 7.0 · Customer Success — consultivo, read-only, sem alterações em módulos protegidos.
      </p>
    </div>
  );
};

const KpiCard: React.FC<{
  icon: React.ReactNode; label: string; value: string; tone?: 'success' | 'warning';
}> = ({ icon, label, value, tone }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
        {icon}<span>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${
        tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-foreground'
      }`}>{value}</div>
    </CardContent>
  </Card>
);

export default FounderCustomerSuccessPage;
