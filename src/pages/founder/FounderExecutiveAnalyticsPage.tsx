/**
 * Sprint 3.2 · Founder Executive Analytics (READ-ONLY).
 * Aggregates Historical + Growth + Capacity + Risk + Benchmark engines
 * on top of existing read-only hooks. No writes. No functional changes.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, Gauge, ShieldCheck } from 'lucide-react';
import LiveSourceBadge from '@/components/founder/LiveSourceBadge';
import { useHistoricalEngine, type SeriesKey, WINDOWS } from '@/lib/ops/historicalEngine';
import { computeGrowth, computeCapacityMatrix, CAPACITY_TARGETS } from '@/lib/ops/growthAnalytics';
import { computeRisks, computeBenchmark, type RiskLevel } from '@/lib/ops/riskEngine';
import { useLiveOpsMetrics } from '@/lib/ops/useLiveOpsMetrics';
import { useStorageMetrics } from '@/lib/ops/useStorageMetrics';
import { computeScoreV2 } from '@/lib/ops/enterpriseScoreV2';

const LABEL: Record<SeriesKey, string> = {
  companies: 'Empresas', users: 'Utilizadores', sales: 'Vendas',
  fiscalDocs: 'Docs Fiscais', telemetry: 'Telemetry', backgroundTasks: 'Background',
};

const riskColor: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  MEDIUM: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  HIGH: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  CRITICAL: 'bg-red-500/15 text-red-600 border-red-500/30',
};

const fmt = (n: number) => Number(n ?? 0).toLocaleString('pt-PT', { maximumFractionDigits: 0 });

export const FounderExecutiveAnalyticsPage: React.FC = () => {
  const hist = useHistoricalEngine();
  const ops = useLiveOpsMetrics();
  const storage = useStorageMetrics();

  if (hist.isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
      </div>
    );
  }

  const slices = hist.data?.slices;
  const companies = slices?.companies.total ?? 0;
  const salesGrowth = slices ? computeGrowth(slices.sales) : null;
  const salesPerDay = (slices?.sales.byWindow['30d'] ?? 0) / 30;
  const capacityMatrix = computeCapacityMatrix(salesPerDay, Math.max(1, companies));

  const risks = computeRisks({
    storageUsedPct: storage.data ? storage.data.totals.bytes / (20 * 1024 ** 3) : 0,
    dbGrowthPerDay: (slices?.telemetry.byWindow['30d'] ?? 0) / 30 + salesPerDay,
    queueDepth: ops.data?.queue.depth ?? 0,
    workerSuccessRate: ops.data?.queue.successRate ?? 1,
    telemetryPerDay: (slices?.telemetry.byWindow['30d'] ?? 0) / 30,
    fiscalDocsPerDay: (slices?.fiscalDocs.byWindow['30d'] ?? 0) / 30,
    errors24h: ops.data?.errors24h ?? 0,
    backupHoursAgo: 12,
  });

  const bench = computeBenchmark({
    latencyP95Ms: ops.data?.rpc.p95 ?? 0,
    availabilityPct: 99.9 - Math.min(0.9, (ops.data?.errors24h ?? 0) / 1000),
    storageUsedGb: (storage.data?.totals.bytes ?? 0) / 1024 ** 3,
    growthPerDay: (slices?.companies.byWindow['30d'] ?? 0) / 30,
    workerSuccessRate: ops.data?.queue.successRate ?? 1,
    recoveryHoursAgo: 12,
    errorRatePct: (ops.data?.rpc.errorRate ?? 0) * 100,
  });

  const score = computeScoreV2({
    availability: bench.find(b => b.metric === 'Availability')?.status === 'above' ? 95 : 85,
    reliability: (ops.data?.queue.successRate ?? 0.9) * 100,
    performance: (ops.data?.rpc.p95 ?? 0) < 500 ? 90 : 70,
    capacity: risks.find(r => r.category === 'Storage')?.level === 'LOW' ? 90 : 60,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Executive Analytics
          </h2>
          <p className="text-xs text-muted-foreground">
            BI Enterprise · Séries históricas, growth, capacidade, risco e benchmark.
          </p>
        </div>
        <LiveSourceBadge source={hist.data?.source ?? 'offline'} fetchedAt={hist.data?.fetchedAt} />
      </div>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        {slices && (Object.keys(LABEL) as SeriesKey[]).map((k) => {
          const g = computeGrowth(slices[k]);
          const Icon = g.trend === 'up' ? TrendingUp : g.trend === 'down' ? TrendingDown : Minus;
          return (
            <Card key={k}>
              <CardContent className="p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{LABEL[k]}</div>
                <div className="text-2xl font-black mt-1">{fmt(slices[k].total)}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Icon className="h-3 w-3" />
                  {fmt(g.weekly)} / 7d
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Growth table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Growth por janela</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-2">Série</th>
                {WINDOWS.map(w => <th key={w} className="text-right p-2">{w}</th>)}
                <th className="text-right p-2">Trend</th>
              </tr>
            </thead>
            <tbody>
              {slices && (Object.keys(LABEL) as SeriesKey[]).map(k => {
                const g = computeGrowth(slices[k]);
                return (
                  <tr key={k} className="border-t border-border/50">
                    <td className="p-2 font-semibold">{LABEL[k]}</td>
                    {WINDOWS.map(w => <td key={w} className="p-2 text-right">{fmt(slices[k].byWindow[w])}</td>)}
                    <td className="p-2 text-right">
                      <Badge variant="outline" className="text-[10px]">{g.trend}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Capacity matrix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Gauge className="h-4 w-4" /> Capacity intelligence (vendas/dia projetado)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-2">Empresas</th>
                <th className="text-right p-2">/ dia</th>
                <th className="text-right p-2">/ mês</th>
                <th className="text-right p-2">/ ano</th>
              </tr>
            </thead>
            <tbody>
              {capacityMatrix.map((row) => (
                <tr key={row.companies} className="border-t border-border/50">
                  <td className="p-2 font-semibold">{fmt(row.companies)}</td>
                  <td className="p-2 text-right">{fmt(row.perDay)}</td>
                  <td className="p-2 text-right">{fmt(row.perMonth)}</td>
                  <td className="p-2 text-right">{fmt(row.perYear)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Risk */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Risk engine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {risks.map((r) => (
              <div key={r.category} className="flex items-center justify-between border border-border/50 rounded-md px-3 py-2">
                <div>
                  <div className="text-xs font-bold">{r.category}</div>
                  <div className="text-[10px] text-muted-foreground">{r.reason}</div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${riskColor[r.level]}`}>{r.level} · {r.score}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Benchmark */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Benchmark vs metas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bench.map((b) => (
              <div key={b.metric} className="flex items-center justify-between border border-border/50 rounded-md px-3 py-2 text-xs">
                <div className="font-semibold">{b.metric}</div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {b.actual.toFixed(1)}{b.unit} / {b.target}{b.unit}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${b.status === 'above' ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10'
                      : b.status === 'below' ? 'text-red-600 border-red-500/30 bg-red-500/10'
                      : 'text-amber-600 border-amber-500/30 bg-amber-500/10'}`}
                  >
                    {b.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Score */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Enterprise Score V2</div>
            <div className="text-3xl font-black">{score.total} <span className="text-base font-semibold text-muted-foreground">/ 100 · {score.grade}</span></div>
          </div>
          <div className="text-xs text-muted-foreground">
            Atualizado: {hist.data?.fetchedAt ? new Date(hist.data.fetchedAt).toLocaleTimeString('pt-PT') : '—'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FounderExecutiveAnalyticsPage;
