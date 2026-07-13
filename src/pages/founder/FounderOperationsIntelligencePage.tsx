import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, AlertTriangle, TrendingUp, Target, Sparkles } from 'lucide-react';
import { useLiveOpsMetrics } from '@/lib/ops/useLiveOpsMetrics';
import { useLiveEnterpriseMetrics } from '@/lib/ops/useLiveEnterpriseMetrics';
import { useStorageMetrics } from '@/lib/ops/useStorageMetrics';
import { detectRootCauses } from '@/lib/ops/rootCauseEngine';
import { recommend, buildExecutiveSummary, type Recommendation } from '@/lib/ops/recommendationEngine';
import { correlate, type SignalSnapshot } from '@/lib/ops/correlationEngine';
import { computeScoreV2 } from '@/lib/ops/enterpriseScoreV2';
import LiveSourceBadge from '@/components/founder/LiveSourceBadge';

const priorityTone: Record<Recommendation['priority'], string> = {
  LOW: 'border-muted text-muted-foreground',
  MEDIUM: 'border-primary/40 text-primary',
  HIGH: 'border-warning/40 text-warning',
  CRITICAL: 'border-destructive/40 text-destructive',
};

export const FounderOperationsIntelligencePage: React.FC = () => {
  const live = useLiveOpsMetrics();
  const ent = useLiveEnterpriseMetrics();
  const storage = useStorageMetrics();

  const rpc = live.data?.rpc;
  const queue = live.data?.queue;
  const counts = ent.data?.counts;
  const perDay = ent.data?.perDay;
  const STORAGE_SOFT_BYTES = 20 * 1024 ** 3; // 20 GB reference
  const storagePct = storage.data ? Math.min(100, (storage.data.totals.bytes / STORAGE_SOFT_BYTES) * 100) : null;
  const storageGrowth = storage.data ? storage.data.forecast.dailyBytes / 1024 ** 3 : 0;

  const rcInputs = {
    rpcP95Ms: rpc?.p95 ?? null,
    rpcTimeoutRate: rpc?.timeoutRate ?? null,
    storagePct,
    storageGrowthGbPerDay: storageGrowth,
    telemetryPerDay: perDay?.telemetry ?? 0,
    workerSuccessRate: queue?.successRate ?? null,
    queueDepth: queue?.depth ?? 0,
    dlq: queue?.dlq ?? 0,
    fiscal30d: counts?.fiscalDocs30d ?? 0,
  };
  const causes = detectRootCauses(rcInputs);

  const sources = [live.data?.source, ent.data?.source, storage.data ? 'live' : 'degraded'];
  const okSources = sources.filter(s => s === 'live').length;
  const dataQuality = okSources / sources.length;
  const source = okSources === sources.length ? 'live' : okSources === 0 ? 'offline' : 'degraded';

  const recs = recommend({ ...rcInputs, causes, dataQuality });

  const score = computeScoreV2({
    availability: 100 - (rpc?.errorRate ?? 0) * 100,
    reliability: (queue?.successRate ?? 1) * 100,
    performance: Math.max(0, 100 - ((rpc?.p95 ?? 0) / 15)),
    sre: 85,
  });

  const summary = buildExecutiveSummary(recs, causes, score.total);

  const signals: SignalSnapshot[] = [
    { key: 'storage', value: (storagePct ?? 0) / 100, delta: storageGrowth / 10 },
    { key: 'telemetry', value: Math.min(1, (perDay?.telemetry ?? 0) / 20000), delta: 0 },
    { key: 'rpc', value: Math.min(1, (rpc?.p95 ?? 0) / 2000), delta: rpc?.timeoutRate ?? 0 },
    { key: 'workers', value: queue?.successRate ?? 1, delta: 0 },
    { key: 'queue', value: Math.min(1, (queue?.depth ?? 0) / 2000), delta: 0 },
    { key: 'dlq', value: Math.min(1, (queue?.dlq ?? 0) / 500), delta: 0 },
    { key: 'fiscal', value: Math.min(1, (counts?.fiscalDocs30d ?? 0) / 10000), delta: 0 },
    { key: 'database', value: Math.min(1, (counts?.sales ?? 0) / 1_000_000), delta: 0 },
  ];
  const edges = correlate(signals).slice(0, 6);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-black">Operations Intelligence</h2>
        <Badge variant="outline">Enterprise V2 · {score.total} ({score.grade})</Badge>
        <Badge variant="outline">Confidence médio {summary.avgConfidence}%</Badge>
        <Badge variant="outline">Readiness: {summary.enterpriseReadiness}</Badge>
        <LiveSourceBadge source={source as any} fetchedAt={ent.data?.fetchedAt} className="ml-auto" />
      </header>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4 text-primary" /><h3 className="font-bold">Resumo Executivo</h3></div>
        <p className="text-sm text-muted-foreground mb-3">{summary.situation}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase text-primary">Pontos fortes</p>
            <ul className="list-disc pl-4 text-sm">{summary.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          <div>
            <p className="text-xs font-black uppercase text-destructive">Pontos críticos</p>
            <ul className="list-disc pl-4 text-sm">{summary.criticals.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          <div>
            <p className="text-xs font-black uppercase text-warning">Riscos futuros</p>
            <ul className="list-disc pl-4 text-sm">{(summary.futureRisks.length ? summary.futureRisks : ['—']).map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          <div>
            <p className="text-xs font-black uppercase">Recomendações prioritárias</p>
            <ul className="list-disc pl-4 text-sm">{(summary.priorityRecs.length ? summary.priorityRecs : ['—']).map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><Target className="h-4 w-4 text-primary" /><h3 className="font-bold">Top Recomendações</h3></div>
          {recs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma recomendação ativa.</p> : (
            <ul className="space-y-3">
              {recs.slice(0, 8).map(r => (
                <li key={r.id} className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm">{r.title}</p>
                    <Badge variant="outline" className={priorityTone[r.priority]}>{r.priority}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                    <Badge variant="secondary">Impacto: {r.impact}</Badge>
                    <Badge variant="secondary">Risco: {r.risk}</Badge>
                    <Badge variant="outline">Confiança {r.confidence}% · {r.confidenceBand}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-warning" /><h3 className="font-bold">Top Riscos / Causas Prováveis</h3></div>
          {causes.length === 0 ? <p className="text-sm text-muted-foreground">Sem causas detectadas.</p> : (
            <ul className="space-y-2">
              {causes.map(c => (
                <li key={c.id} className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{c.title}</p>
                    <Badge variant="outline">{c.severity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.reason}</p>
                  <p className="text-[10px] mt-1">{c.evidence.join(' · ')}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-primary" /><h3 className="font-bold">Top Correlações</h3></div>
        <div className="grid gap-2 md:grid-cols-3">
          {edges.map(e => (
            <div key={`${e.a}-${e.b}`} className="rounded border border-border/60 p-2 text-xs flex items-center justify-between">
              <span className="font-semibold">{e.a} ↔ {e.b}</span>
              <Badge variant="outline">{(e.score * 100).toFixed(0)}%</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default FounderOperationsIntelligencePage;
