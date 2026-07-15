/**
 * Sprint 4.7 · Founder Strategy Center (read-only, advisory).
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Compass, ListChecks, GitBranch, Gauge, Flag, Sparkles } from 'lucide-react';
import { useLiveOpsMetrics } from '@/lib/ops/useLiveOpsMetrics';
import { useLiveEnterpriseMetrics } from '@/lib/ops/useLiveEnterpriseMetrics';
import { buildStrategicReport } from '@/lib/agentic/strategicPlanner';

const bandColor: Record<string, string> = {
  P0: 'bg-destructive/15 text-destructive',
  P1: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  P2: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  P3: 'bg-muted text-muted-foreground',
};

export const FounderStrategyCenterPage: React.FC = () => {
  const ops = useLiveOpsMetrics();
  const ent = useLiveEnterpriseMetrics();

  const report = React.useMemo(() => {
    const successRate = ops.data?.queue.successRate ?? 0;
    const opsHealth = Math.round(successRate * 100);
    return buildStrategicReport({
      opsHealth,
      enterpriseScore: 92,
      storageUsagePct: 40,
      knowledgeScore: 88,
      policyScore: 90,
      simulationScore: 85,
      executionReadiness: 82,
      activeInitiatives: ent.data?.counts.companies ?? 0,
      teamCapacity: 80,
    });
  }, [ops.data, ent.data]);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Strategy Center</h2>
            <p className="text-sm text-muted-foreground">
              Camada consultiva de orquestração estratégica. Somente leitura.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4" /> Score Estratégico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{report.score.score}</div>
            <Badge variant="outline" className="mt-1">{report.score.rating}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Gauge className="h-4 w-4" /> Utilização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{report.resources.utilizationPct}%</div>
            <p className="text-xs text-muted-foreground">
              {report.resources.overloaded ? 'Capacidade excedida' : 'Dentro da capacidade'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="h-4 w-4" /> Iniciativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{report.portfolio.total}</div>
            <p className="text-xs text-muted-foreground">Perfil: {report.portfolio.balance}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <GitBranch className="h-4 w-4" /> Dependências
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{report.graph.edges.length}</div>
            <p className="text-xs text-muted-foreground">
              {report.graph.hasCycle ? `${report.graph.cycles.length} ciclo(s)` : 'Acíclico'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="h-4 w-4" /> Objetivos Estratégicos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {report.objectives.map((o) => (
              <div key={o.id} className="rounded-xl border border-border/60 bg-background/50 p-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{o.pillar}</Badge>
                  <span className="text-xs text-muted-foreground">gap {o.gap}</span>
                </div>
                <p className="mt-2 font-semibold">{o.title}</p>
                <p className="text-xs text-muted-foreground">{o.rationale}</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${o.currentScore}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Flag className="h-4 w-4" /> Roadmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(['NOW', 'NEXT', 'LATER'] as const).map((h) => (
              <div key={h} className="rounded-xl border border-border/60 bg-background/50 p-4">
                <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">{h}</p>
                <div className="space-y-2">
                  {report.roadmap.filter((r) => r.horizon === h).map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{r.title}</span>
                      <Badge className={bandColor[r.band]}>{r.band}</Badge>
                    </div>
                  ))}
                  {report.roadmap.filter((r) => r.horizon === h).length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum item.</p>
                  )}
                </div>
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
          <p className="font-semibold">{report.summary.headline}</p>
          <ul className="list-inside list-disc text-muted-foreground">
            {report.summary.highlights.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
          {report.summary.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-xs font-bold uppercase text-amber-700 dark:text-amber-400">Alertas</p>
              <ul className="list-inside list-disc text-xs">
                {report.summary.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Recomendação: <span className="font-semibold text-foreground">{report.summary.recommendation}</span>
          </p>
          <Badge variant="outline" className="mt-2">Status: {report.status} · 100% consultiva</Badge>
        </CardContent>
      </Card>
    </div>
  );
};

export default FounderStrategyCenterPage;
