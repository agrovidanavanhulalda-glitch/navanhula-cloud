/**
 * Sprint 3.4 · Founder Executive AI Copilot (READ-ONLY).
 * Aggregates live metrics into an executive-level report.
 * Never writes. Never mutates state. Advisory only.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, ShieldAlert, Sparkles, Target, Gauge } from 'lucide-react';
import { useLiveOpsMetrics } from '@/lib/ops/useLiveOpsMetrics';
import { useLiveEnterpriseMetrics } from '@/lib/ops/useLiveEnterpriseMetrics';
import { useStorageMetrics } from '@/lib/ops/useStorageMetrics';
import { buildExecutiveReport, type ExecutiveInsight } from '@/lib/ops/executiveInsightsEngine';
import { LiveSourceBadge } from '@/components/founder/LiveSourceBadge';

const priorityColor: Record<ExecutiveInsight['level'], string> = {
  CRITICAL: 'bg-destructive text-destructive-foreground',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-yellow-500 text-black',
  LOW: 'bg-muted text-muted-foreground',
};

const ScoreCard: React.FC<{ label: string; value: number; icon: React.ReactNode; hint?: string }> = ({ label, value, icon, hint }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}<span className="text-sm text-muted-foreground">/100</span></div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

const InsightList: React.FC<{ title: string; items: ExecutiveInsight[]; icon: React.ReactNode; empty: string }> = ({ title, items, icon, empty }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {items.length === 0 && <p className="text-sm text-muted-foreground">{empty}</p>}
      {items.map((it, i) => (
        <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3">
          <div className="min-w-0">
            <div className="font-semibold text-sm">{it.title}</div>
            <div className="text-xs text-muted-foreground">{it.description}</div>
          </div>
          <Badge className={priorityColor[it.level]}>{it.level}</Badge>
        </div>
      ))}
    </CardContent>
  </Card>
);

export const FounderExecutiveCopilotPage: React.FC = () => {
  const live = useLiveOpsMetrics();
  const enterprise = useLiveEnterpriseMetrics();
  const storage = useStorageMetrics();

  const okSources =
    (live.data?.source === 'live' ? 1 : live.data?.source === 'degraded' ? 0.5 : 0) +
    (enterprise.data?.source === 'live' ? 1 : enterprise.data?.source === 'degraded' ? 0.5 : 0) +
    (storage.data?.source === 'live' ? 1 : storage.data?.source === 'degraded' ? 0.5 : 0);

  const storageGb = (storage.data?.totals.bytes ?? 0) / (1024 ** 3);
  const storageGrowthGbPerDay = (storage.data?.forecast.dailyBytes ?? 0) / (1024 ** 3);

  const report = buildExecutiveReport({
    companies: enterprise.data?.counts.companies ?? 0,
    users: enterprise.data?.counts.users ?? 0,
    sales30d: enterprise.data?.counts.sales30d ?? 0,
    salesPerDay: enterprise.data?.perDay.sales ?? 0,
    fiscalDocs30d: enterprise.data?.counts.fiscalDocs30d ?? 0,
    fiscalPerDay: enterprise.data?.perDay.fiscal ?? 0,
    storageGb,
    storageGrowthGbPerDay,
    storagePct: null,
    telemetryPerDay: enterprise.data?.perDay.telemetry ?? 0,
    workersPerDay: enterprise.data?.perDay.tasks ?? 0,
    workerSuccessRate: live.data?.queue.successRate ?? null,
    queueDepth: live.data?.queue.depth ?? 0,
    dlq: live.data?.queue.dlq ?? 0,
    rpcP95Ms: live.data?.rpc.p95 ?? null,
    errorRate: live.data?.rpc.errorRate ?? null,
    liveSourceOk: okSources / 3,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Executive AI Copilot</h2>
            <p className="text-sm text-muted-foreground">Análise executiva automática baseada em métricas reais (read-only)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <LiveSourceBadge source={live.data?.source ?? 'offline'} label="Ops" />
          <LiveSourceBadge source={enterprise.data?.source ?? 'offline'} label="Enterprise" />
          <LiveSourceBadge source={storage.data?.source ?? 'offline'} label="Storage" />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{report.summary}</p>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-border/60 p-3">
              <div className="text-xs font-semibold text-muted-foreground">Weekly Outlook</div>
              <div>{report.weeklyOutlook}</div>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <div className="text-xs font-semibold text-muted-foreground">Monthly Forecast</div>
              <div>{report.monthlyForecast}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <ScoreCard label="Business Health" value={report.businessHealth} icon={<Gauge className="h-4 w-4 text-primary" />} />
        <ScoreCard label="Growth Score" value={report.growthScore} icon={<TrendingUp className="h-4 w-4 text-primary" />} />
        <ScoreCard label="Risk Score" value={report.riskScore} icon={<ShieldAlert className="h-4 w-4 text-destructive" />} hint="menor é melhor" />
        <ScoreCard label="Confidence" value={report.confidenceScore} icon={<Brain className="h-4 w-4 text-primary" />} />
        <ScoreCard label="Data Quality" value={report.dataQualityScore} icon={<Sparkles className="h-4 w-4 text-primary" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InsightList title="Top Riscos" items={report.operationalRisks} icon={<ShieldAlert className="h-4 w-4 text-destructive" />} empty="Sem riscos ativos." />
        <InsightList title="Recomendações Executivas" items={report.recommendations} icon={<Target className="h-4 w-4 text-primary" />} empty="Sem recomendações urgentes." />
        <InsightList title="Priority Matrix" items={report.priorityMatrix} icon={<Gauge className="h-4 w-4 text-primary" />} empty="Nada a priorizar." />
        <InsightList title="Top Oportunidades" items={report.opportunities} icon={<Sparkles className="h-4 w-4 text-primary" />} empty="Sem oportunidades detectadas." />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> Forecast (7 / 30 / 90 / 365 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 text-sm">
            {[
              { k: 'Vendas', f: report.forecast.sales },
              { k: 'Documentos Fiscais', f: report.forecast.fiscalDocs },
              { k: 'Storage (GB)', f: report.forecast.storageGb },
              { k: 'Telemetria', f: report.forecast.telemetry },
            ].map(({ k, f }) => (
              <div key={k} className="rounded-lg border border-border/60 p-3">
                <div className="text-xs font-semibold text-muted-foreground">{k}</div>
                <div className="mt-1 grid grid-cols-4 gap-1 text-center">
                  <div><div className="text-[10px] text-muted-foreground">7d</div><div className="font-semibold">{f.d7.toFixed(1)}</div></div>
                  <div><div className="text-[10px] text-muted-foreground">30d</div><div className="font-semibold">{f.d30.toFixed(1)}</div></div>
                  <div><div className="text-[10px] text-muted-foreground">90d</div><div className="font-semibold">{f.d90.toFixed(1)}</div></div>
                  <div><div className="text-[10px] text-muted-foreground">365d</div><div className="font-semibold">{f.d365.toFixed(1)}</div></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FounderExecutiveCopilotPage;
