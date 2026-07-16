import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { assessCustomer360Portfolio } from '@/lib/agentic/customer360/customer360Aggregator';
import type { Customer360Input } from '@/lib/agentic/customer360/types';

const SAMPLE: Customer360Input[] = [
  { id: '1', name: 'Alpha Retail', planTier: 'enterprise', mrr: 4500, tenureDays: 720, healthScore: 92, journeyScore: 88, nps: 72, csat: 94, supportScore: 90, renewalScore: 95, renewalProbability: 0.95, churnProbability: 0.03, expansionMrr: 800, openTickets: 1, criticalTickets: 0, feedbackCount: 12, lifecycleStage: 'expansion' },
  { id: '2', name: 'Beta Foods', planTier: 'pro', mrr: 1800, tenureDays: 300, healthScore: 74, journeyScore: 68, nps: 30, csat: 78, supportScore: 72, renewalScore: 70, renewalProbability: 0.7, churnProbability: 0.15, expansionMrr: 300, openTickets: 3, criticalTickets: 0, feedbackCount: 5, lifecycleStage: 'retention' },
  { id: '3', name: 'Gamma Shop', planTier: 'starter', mrr: 750, tenureDays: 45, healthScore: 55, journeyScore: 40, nps: 0, csat: 60, supportScore: 65, renewalScore: 55, renewalProbability: 0.5, churnProbability: 0.35, expansionMrr: 0, openTickets: 4, criticalTickets: 1, feedbackCount: 2, lifecycleStage: 'adoption' },
  { id: '4', name: 'Delta Logistics', planTier: 'pro', mrr: 2200, tenureDays: 900, healthScore: 28, journeyScore: 30, nps: -40, csat: 35, supportScore: 40, renewalScore: 25, renewalProbability: 0.2, churnProbability: 0.8, expansionMrr: 0, openTickets: 8, criticalTickets: 3, feedbackCount: 8, lifecycleStage: 'churn' },
];

const Metric: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{label}</CardTitle></CardHeader>
    <CardContent><div className="text-2xl font-black">{value}</div>{hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}</CardContent>
  </Card>
);

export const FounderCustomer360Page: React.FC = () => {
  const portfolio = useMemo(() => assessCustomer360Portfolio(SAMPLE), []);
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-black tracking-tight">Customer 360° Executive Center</h2>
        <p className="text-sm text-muted-foreground">Visão executiva consolidada dos clientes (read-only, determinístico).</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Clientes" value={portfolio.total} />
        <Metric label="MRR Total" value={`${portfolio.totalMrr.toLocaleString('pt-PT')} MZN`} />
        <Metric label="Score 360° Médio" value={portfolio.avgScore} />
        <Metric label="Executive Score Médio" value={portfolio.avgExecutiveScore} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Distribuição por Saúde</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {Object.entries(portfolio.portfolio.byHealth).map(([k, v]) => (
                <li key={k} className="flex justify-between"><span>{k}</span><span className="font-semibold">{v}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Distribuição por Jornada</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {Object.entries(portfolio.portfolio.byJourney).map(([k, v]) => (
                <li key={k} className="flex justify-between"><span>{k}</span><span className="font-semibold">{v}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Ranking Executive Score</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              {portfolio.ranking.map((r) => (
                <li key={r.id} className="flex items-center justify-between border-b pb-1 last:border-0">
                  <span>{r.name}</span>
                  <span className="flex items-center gap-2"><Badge variant="secondary">{r.tier}</Badge><span className="font-bold">{r.score}</span></span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Clientes em Risco</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              {portfolio.topAtRisk.map((r) => (
                <li key={r.id} className="flex justify-between border-b pb-1 last:border-0">
                  <span>{r.name}</span><span className="font-bold text-destructive">{r.risk}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Executive Summaries</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            {portfolio.assessments.map((a) => (
              <li key={a.id} className="border-b pb-2 last:border-0">
                <div className="font-semibold">{a.summary.headline}</div>
                <ul className="text-xs text-muted-foreground list-disc list-inside">
                  {a.summary.highlights.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Insights da Carteira</CardTitle></CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1">
            {portfolio.insights.map((i, idx) => <li key={idx}>• {i.message}</li>)}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default FounderCustomer360Page;
