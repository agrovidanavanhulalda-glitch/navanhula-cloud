/**
 * Sprint 5.1 · Founder Transformation Center (read-only, advisory).
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket, TrendingUp, Target, AlertTriangle, Flag, Sparkles, Gauge } from 'lucide-react';
import { normalizeTransformations, type TransformationInput } from '@/lib/agentic/transformationEngine';
import { computeTransformationScore } from '@/lib/agentic/transformationScoreEngine';
import { computeValueScore } from '@/lib/agentic/valueEngine';
import { evaluateRealization } from '@/lib/agentic/valueRealizationEngine';
import { rankInitiatives } from '@/lib/agentic/initiativeValueEngine';
import { evaluateOutcomes } from '@/lib/agentic/businessOutcomeEngine';
import { evaluateAlignment } from '@/lib/agentic/kpiAlignmentEngine';
import { analyzePortfolioValue } from '@/lib/agentic/portfolioValueEngine';
import { assessRisks } from '@/lib/agentic/transformationRiskEngine';
import { buildRoadmap } from '@/lib/agentic/transformationRoadmapEngine';
import { forecastValue } from '@/lib/agentic/valueForecastEngine';
import { buildTransformationSummary } from '@/lib/agentic/transformationSummaryEngine';

const seed: TransformationInput[] = [
  { id: 'T1', name: 'Cloud Migration', pillar: 'TECHNOLOGY', progress: 65, investment: 1200, value: 3400, risk: 30, alignment: 88, maturity: 4 },
  { id: 'T2', name: 'Data Platform', pillar: 'DATA', progress: 45, investment: 900, value: 2200, risk: 40, alignment: 78, maturity: 3 },
  { id: 'T3', name: 'AI Enablement', pillar: 'TECHNOLOGY', progress: 30, investment: 700, value: 1800, risk: 55, alignment: 70, maturity: 2 },
  { id: 'T4', name: 'Process Automation', pillar: 'PROCESS', progress: 55, investment: 600, value: 1500, risk: 35, alignment: 82, maturity: 3 },
  { id: 'T5', name: 'Enterprise Governance', pillar: 'GOVERNANCE', progress: 40, investment: 400, value: 1100, risk: 45, alignment: 74, maturity: 3 },
  { id: 'T6', name: 'People & Skills', pillar: 'PEOPLE', progress: 50, investment: 500, value: 1300, risk: 30, alignment: 80, maturity: 3 },
];

const bandColor: Record<string, string> = {
  P0: 'bg-destructive/15 text-destructive',
  P1: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  P2: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  P3: 'bg-muted text-muted-foreground',
};

export const FounderTransformationCenterPage: React.FC = () => {
  const items = React.useMemo(() => normalizeTransformations(seed), []);
  const score = React.useMemo(() => computeTransformationScore(items), [items]);
  const value = React.useMemo(() => computeValueScore(items), [items]);
  const realization = React.useMemo(() => evaluateRealization(items), [items]);
  const ranked = React.useMemo(() => rankInitiatives(items), [items]);
  const outcomes = React.useMemo(() => evaluateOutcomes(items), [items]);
  const alignment = React.useMemo(() => evaluateAlignment(items), [items]);
  const portfolio = React.useMemo(() => analyzePortfolioValue(items), [items]);
  const risks = React.useMemo(() => assessRisks(items), [items]);
  const roadmap = React.useMemo(() => buildRoadmap(items), [items]);
  const forecast = React.useMemo(() => forecastValue(items), [items]);
  const summary = React.useMemo(() => buildTransformationSummary(items), [items]);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Transformation Center</h2>
            <p className="text-sm text-muted-foreground">
              Camada consultiva de Enterprise Transformation & Value Management. Somente leitura.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4" /> Transformation Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{score.score}</div>
            <Badge variant="outline" className="mt-1">{score.rating}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4" /> Business Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{value.score}</div>
            <Badge variant="outline" className="mt-1">{value.rating}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Gauge className="h-4 w-4" /> Realization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{realization.realizationRate}%</div>
            <p className="text-xs text-muted-foreground">{realization.rating}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4" /> KPI Alignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{alignment.avgAlignment}%</div>
            <p className="text-xs text-muted-foreground">{alignment.rating}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Initiative Value Ranking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ranked.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="text-xs text-muted-foreground">Score {r.score}</p>
                </div>
                <Badge className={bandColor[r.band]}>{r.band}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Business Outcomes (by Pillar)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {outcomes.map((o) => (
                <div key={o.pillar} className="rounded-lg border border-border/60 bg-background/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{o.pillar}</span>
                    <Badge variant="outline">{o.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {o.count} iniciativa(s) · progresso {o.avgProgress}% · valor médio {o.avgValue}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Transformation Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 text-sm text-muted-foreground">
              Risco médio: <span className="font-semibold text-foreground">{risks.avgRisk}</span> · {risks.rating}
            </div>
            <div className="space-y-2">
              {risks.items.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{r.name}</span>
                  <Badge variant="outline">{r.level}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Flag className="h-4 w-4" /> Executive Roadmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(['NOW', 'NEXT', 'LATER'] as const).map((h) => (
              <div key={h} className="rounded-xl border border-border/60 bg-background/50 p-4">
                <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">{h}</p>
                <div className="space-y-2">
                  {roadmap.filter((r) => r.horizon === h).map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{r.name}</span>
                      <Badge className={bandColor[r.band]}>{r.band}</Badge>
                    </div>
                  ))}
                  {roadmap.filter((r) => r.horizon === h).length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum item.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Investimento total: <span className="font-semibold">{portfolio.totalInvestment}</span></p>
            <p>Valor total: <span className="font-semibold">{portfolio.totalValue}</span></p>
            <p>Valor líquido: <span className="font-semibold">{portfolio.netValue}</span></p>
            <p>ROI: <span className="font-semibold">{portfolio.roi}%</span></p>
            <p>Balanceamento: <span className="font-semibold">{portfolio.balance}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Value Forecast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Projeção 3m: <span className="font-semibold">{forecast.projected3m}</span></p>
            <p>Projeção 6m: <span className="font-semibold">{forecast.projected6m}</span></p>
            <p>Projeção 12m: <span className="font-semibold">{forecast.projected12m}</span></p>
            <p>Confiança: <span className="font-semibold">{forecast.confidence}%</span></p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-semibold">{summary.headline}</p>
          <ul className="list-inside list-disc text-muted-foreground">
            {summary.highlights.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
          {summary.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-xs font-bold uppercase text-amber-700 dark:text-amber-400">Alertas</p>
              <ul className="list-inside list-disc text-xs">
                {summary.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Recomendação: <span className="font-semibold text-foreground">{summary.recommendation}</span>
          </p>
          <Badge variant="outline" className="mt-2">100% consultiva · determinística · Founder-only</Badge>
        </CardContent>
      </Card>
    </div>
  );
};

export default FounderTransformationCenterPage;
