/**
 * Sprint 5.2 · Founder Risk Center (read-only, advisory).
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, AlertTriangle, TrendingUp, Activity, Target, Flame, Sparkles } from 'lucide-react';
import { normalizeRisks, type RiskInput } from '@/lib/agentic/risk/enterpriseRiskEngine';
import { computeExecutiveScore } from '@/lib/agentic/risk/riskScoreEngine';
import { buildRegister } from '@/lib/agentic/risk/riskRegisterEngine';
import { assess } from '@/lib/agentic/risk/riskAssessmentEngine';
import { buildHeatmap } from '@/lib/agentic/risk/riskHeatmapEngine';
import { computeExposure } from '@/lib/agentic/risk/riskExposureEngine';
import { computeResidual } from '@/lib/agentic/risk/residualRiskEngine';
import { computeTrend } from '@/lib/agentic/risk/riskTrendEngine';
import { forecastRisk } from '@/lib/agentic/risk/riskForecastEngine';
import { recommendTreatment } from '@/lib/agentic/risk/riskTreatmentEngine';
import { analyzePortfolio } from '@/lib/agentic/risk/riskPortfolioEngine';
import { buildRiskSummary } from '@/lib/agentic/risk/riskSummaryEngine';

const seed: RiskInput[] = [
  { id: 'R1', name: 'Data Breach', category: 'SECURITY', probability: 70, impact: 90, mitigation: 65, velocity: 60, detectability: 55 },
  { id: 'R2', name: 'Cash Flow Volatility', category: 'FINANCIAL', probability: 45, impact: 75, mitigation: 55, velocity: 30, detectability: 80 },
  { id: 'R3', name: 'Compliance Gap', category: 'COMPLIANCE', probability: 35, impact: 80, mitigation: 40, velocity: 40, detectability: 70 },
  { id: 'R4', name: 'Downtime Incident', category: 'TECHNOLOGY', probability: 40, impact: 60, mitigation: 55, velocity: 55, detectability: 60 },
  { id: 'R5', name: 'Talent Attrition', category: 'OPERATIONAL', probability: 55, impact: 50, mitigation: 45, velocity: 45, detectability: 65 },
  { id: 'R6', name: 'Reputational Event', category: 'REPUTATIONAL', probability: 25, impact: 85, mitigation: 35, velocity: 70, detectability: 40 },
  { id: 'R7', name: 'Market Shift', category: 'STRATEGIC', probability: 50, impact: 70, mitigation: 30, velocity: 50, detectability: 45 },
];

const levelColor: Record<string, string> = {
  LOW: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  MEDIUM: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  HIGH: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  CRITICAL: 'bg-destructive/15 text-destructive',
};

const actionColor: Record<string, string> = {
  MITIGATE: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  TRANSFER: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  ACCEPT: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  AVOID: 'bg-destructive/15 text-destructive',
};

function cellShade(count: number, max: number): string {
  if (max <= 0 || count <= 0) return 'bg-muted/40';
  const ratio = count / max;
  if (ratio > 0.75) return 'bg-destructive/60 text-destructive-foreground';
  if (ratio > 0.5) return 'bg-amber-500/60 text-white';
  if (ratio > 0.25) return 'bg-amber-400/40';
  return 'bg-emerald-500/30';
}

export const FounderRiskCenterPage: React.FC = () => {
  const risks = React.useMemo(() => normalizeRisks(seed), []);
  const exec = React.useMemo(() => computeExecutiveScore(risks), [risks]);
  const register = React.useMemo(() => buildRegister(risks), [risks]);
  const assessment = React.useMemo(() => assess(risks), [risks]);
  const heatmap = React.useMemo(() => buildHeatmap(risks), [risks]);
  const exposure = React.useMemo(() => computeExposure(risks), [risks]);
  const residual = React.useMemo(() => computeResidual(risks), [risks]);
  const trend = React.useMemo(() => computeTrend(risks), [risks]);
  const forecast = React.useMemo(() => forecastRisk(risks), [risks]);
  const treatments = React.useMemo(() => recommendTreatment(risks), [risks]);
  const portfolio = React.useMemo(() => analyzePortfolio(risks), [risks]);
  const summary = React.useMemo(() => buildRiskSummary(risks), [risks]);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Enterprise Risk Center</h2>
            <p className="text-sm text-muted-foreground">
              Camada consultiva de Enterprise Risk Management. Somente leitura · determinística · Founder-only.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4" /> Executive Risk Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{exec.score}</div>
            <Badge variant="outline" className="mt-1">{exec.rating}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Flame className="h-4 w-4" /> Exposure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{exposure.totalExposure}</div>
            <p className="text-xs text-muted-foreground">{exposure.rating} · peak {exposure.peak}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4" /> Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{trend.direction}</div>
            <p className="text-xs text-muted-foreground">
              24h {trend.points[0].score} · 90d {trend.points[3].score}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4" /> Forecast Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{forecast.confidence}%</div>
            <p className="text-xs text-muted-foreground">
              30d {forecast.d30} · 90d {forecast.d90} · 1a {forecast.d365}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Enterprise Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {register.slice(0, 8).map((r) => {
                const level = assessment.find((a) => a.id === r.id)?.level ?? 'LOW';
                return (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.category} · score {r.inherent}</p>
                    </div>
                    <Badge className={levelColor[level]}>{level}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-4 w-4" /> Risk Heat Map (Impact × Probability)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-1">
              {/* rows: impact top→bottom (4→0) */}
              {[4, 3, 2, 1, 0].map((row) =>
                [0, 1, 2, 3, 4].map((col) => {
                  const cell = heatmap.cells.find((c) => c.row === row && c.col === col)!;
                  return (
                    <div
                      key={`${row}-${col}`}
                      className={`flex h-14 items-center justify-center rounded-md border border-border/40 text-xs font-bold ${cellShade(cell.count, heatmap.max)}`}
                      title={`Impact ${row * 20}-${row * 20 + 19} · Prob ${col * 20}-${col * 20 + 19}`}
                    >
                      {cell.count > 0 ? cell.count : ''}
                    </div>
                  );
                }),
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>← Baixa Probabilidade</span>
              <span>Alta Probabilidade →</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Residual Risk (Before → After)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 text-sm text-muted-foreground">
              Média: <span className="font-semibold text-foreground">{residual.avgBefore}</span> →{' '}
              <span className="font-semibold text-foreground">{residual.avgAfter}</span> (Δ {residual.avgDelta})
            </div>
            <div className="space-y-2">
              {residual.items.slice(0, 6).map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{r.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {r.before} → <span className="font-semibold text-foreground">{r.after}</span> (Δ {r.delta})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {trend.points.map((p) => (
                <div key={p.window} className="rounded-lg border border-border/60 bg-background/50 p-3 text-center">
                  <p className="text-xs uppercase text-muted-foreground">{p.window}</p>
                  <p className="text-2xl font-black">{p.score}</p>
                  <p className={`text-xs ${p.delta > 0 ? 'text-destructive' : p.delta < 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {p.delta > 0 ? '+' : ''}{p.delta}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Recomendações de Tratamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {treatments.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.rationale}</p>
                </div>
                <Badge className={actionColor[t.action]}>{t.action}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Portfolio de Risco (por Categoria)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-xs text-muted-foreground">
            Concentração HHI: <span className="font-semibold text-foreground">{portfolio.concentration}</span> ·{' '}
            {portfolio.diversified ? 'Diversificado' : 'Concentrado'}
          </p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {portfolio.slices.map((s) => (
              <div key={s.category} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 p-3">
                <div>
                  <p className="font-semibold">{s.category}</p>
                  <p className="text-xs text-muted-foreground">{s.count} risco(s) · peak {s.peakScore}</p>
                </div>
                <Badge variant="outline">avg {s.avgScore}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
            Recomendação executiva: <span className="font-semibold text-foreground">{summary.recommendation}</span>
          </p>
          <Badge variant="outline" className="mt-2">100% consultiva · determinística · Founder-only</Badge>
        </CardContent>
      </Card>
    </div>
  );
};

export default FounderRiskCenterPage;
