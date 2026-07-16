/**
 * Sprint 7.1 · Founder Customer Journey Center (read-only, deterministic).
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Route, Rocket, Sparkles, Activity, Users, TrendingUp, AlertTriangle, Flag, Clock } from 'lucide-react';
import {
  assessJourneyPortfolio,
  type PortfolioJourney,
} from '@/lib/agentic/customer-journey/customerJourneyAggregator';
import { JOURNEY_STAGES, type JourneyStage } from '@/lib/agentic/customer-journey/journeyStageEngine';
import type { CustomerRecord } from '@/lib/agentic/customer-success/customerSuccessAggregator';

const SEED: CustomerRecord[] = [
  { id: 'j-1', name: 'Padaria Central LDA', planTier: 'pro', signals: {
    tenureDays: 210, daysSinceLastLogin: 1, onboardingCompletionPct: 100,
    featureAdoptionPct: 82, sales30d: 640, salesPrev30d: 590, fiscalDocs30d: 210,
    openTickets: 1, criticalTickets: 0, daysToRenewal: 45, hasOverdueInvoice: false, mrr: 1500,
  }},
  { id: 'j-2', name: 'Agro Zambézia', planTier: 'starter', signals: {
    tenureDays: 60, daysSinceLastLogin: 22, onboardingCompletionPct: 35,
    featureAdoptionPct: 20, sales30d: 12, salesPrev30d: 40, fiscalDocs30d: 3,
    openTickets: 2, criticalTickets: 1, daysToRenewal: 5, hasOverdueInvoice: true, mrr: 750,
  }},
  { id: 'j-3', name: 'Retail Maputo Norte', planTier: 'enterprise', signals: {
    tenureDays: 400, daysSinceLastLogin: 0, onboardingCompletionPct: 100,
    featureAdoptionPct: 95, sales30d: 2100, salesPrev30d: 1900, fiscalDocs30d: 890,
    openTickets: 0, criticalTickets: 0, daysToRenewal: 120, hasOverdueInvoice: false, mrr: 3500,
  }},
  { id: 'j-4', name: 'Avícola Beira', planTier: 'starter', signals: {
    tenureDays: 45, daysSinceLastLogin: 40, onboardingCompletionPct: 55,
    featureAdoptionPct: 30, sales30d: 0, salesPrev30d: 30, fiscalDocs30d: 0,
    openTickets: 3, criticalTickets: 0, daysToRenewal: -5, hasOverdueInvoice: true, mrr: 750,
  }},
  { id: 'j-5', name: 'Mercearia Nampula', planTier: 'starter', signals: {
    tenureDays: 10, daysSinceLastLogin: 1, onboardingCompletionPct: 25,
    featureAdoptionPct: 10, sales30d: 0, salesPrev30d: 0, fiscalDocs30d: 0,
    openTickets: 0, criticalTickets: 0, daysToRenewal: 20, hasOverdueInvoice: false, mrr: 750,
  }},
];

const stageTone = (stage: JourneyStage | 'AT_RISK') =>
  stage === 'CHAMPION' || stage === 'EXPANSION' ? 'bg-success/15 text-success border-success/30'
  : stage === 'AT_RISK' ? 'bg-destructive/15 text-destructive border-destructive/30'
  : stage === 'RENEWAL' ? 'bg-warning/15 text-warning border-warning/30'
  : 'bg-muted text-muted-foreground border-border';

const stageLabel: Record<JourneyStage, string> = {
  LEAD: 'Lead', TRIAL: 'Trial', SETUP: 'Setup', ONBOARDING: 'Onboarding',
  FIRST_SALE: 'Primeira Venda', ACTIVE: 'Cliente Ativo', POWER_USER: 'Power User',
  RENEWAL: 'Renovação', EXPANSION: 'Expansão', CHAMPION: 'Champion', AT_RISK: 'Em Risco',
};

export const FounderCustomerJourneyPage: React.FC = () => {
  const portfolio: PortfolioJourney = React.useMemo(() => assessJourneyPortfolio(SEED), []);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Route className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Customer Journey Intelligence</h1>
            <p className="text-xs text-muted-foreground">
              Lead → Trial → Onboarding → Primeira Venda → Adoção → Renovação → Champion. Consultivo, read-only.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Sparkles className="h-4 w-4" />} label="Journey Score" value={`${portfolio.avgJourneyScore}/100`} tone="success" />
        <Kpi icon={<Rocket className="h-4 w-4" />} label="Activation" value={`${portfolio.avgActivation}/100`} />
        <Kpi icon={<Activity className="h-4 w-4" />} label="Adoption" value={`${portfolio.avgAdoption}/100`} />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Engagement" value={`${portfolio.avgEngagement}/100`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Users className="h-4 w-4" />} label="Retention média" value={`${portfolio.avgRetention}/100`} />
        <Kpi icon={<Clock className="h-4 w-4" />} label="Tempo médio até ativação" value={`${portfolio.avgDaysToActivation}d`} />
        <Kpi icon={<Rocket className="h-4 w-4" />} label="Recém-ativados" value={portfolio.newlyActivated.length.toString()} tone="success" />
        <Kpi icon={<AlertTriangle className="h-4 w-4" />} label="Em risco" value={portfolio.atRiskCustomers.length.toString()} tone="warning" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="h-4 w-4" /> Distribuição por Estágio
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {JOURNEY_STAGES.map((stage) => (
            <div key={stage} className="rounded-lg border border-border/60 px-3 py-2 text-center min-w-[110px]">
              <Badge variant="outline" className={`${stageTone(stage)} text-[10px]`}>{stageLabel[stage]}</Badge>
              <div className="mt-1 text-lg font-bold">{portfolio.stageDistribution[stage]}</div>
            </div>
          ))}
          <div className="rounded-lg border border-destructive/30 px-3 py-2 text-center min-w-[110px]">
            <Badge variant="outline" className={`${stageTone('AT_RISK')} text-[10px]`}>Em Risco</Badge>
            <div className="mt-1 text-lg font-bold">{portfolio.stageDistribution.AT_RISK}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Flag className="h-4 w-4" /> Jornada dos Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {portfolio.customers.map((c) => (
            <div key={c.id} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.summary.headline} · {c.summary.nextAction}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase">{c.planTier}</Badge>
                  <Badge variant="outline" className={`${stageTone(c.stage)} text-[10px]`}>{stageLabel[c.stage]}</Badge>
                  <span className="text-xs font-mono">{c.score.score}/100</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1 mt-2">
                {c.timeline.map((step, i) => (
                  <React.Fragment key={step.stage}>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border ${
                        step.current ? 'bg-primary text-primary-foreground border-primary'
                        : step.reached ? 'bg-success/10 text-success border-success/30'
                        : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {stageLabel[step.stage]}
                    </span>
                    {i < c.timeline.length - 1 && <span className="text-[10px] text-muted-foreground">→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground text-center">
        Sprint 7.1 · Customer Journey — consultivo, read-only, sem alterações em módulos protegidos.
      </p>
    </div>
  );
};

const Kpi: React.FC<{
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

export default FounderCustomerJourneyPage;
