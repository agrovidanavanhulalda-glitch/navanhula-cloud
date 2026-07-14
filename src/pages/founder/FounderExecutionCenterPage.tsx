import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Rocket, ShieldAlert, Timer, GitBranch, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import { useLiveOpsMetrics } from '@/lib/ops/useLiveOpsMetrics';
import { useStorageMetrics } from '@/lib/ops/useStorageMetrics';
import { useLiveEnterpriseMetrics } from '@/lib/ops/useLiveEnterpriseMetrics';
import { proposeAll } from '@/lib/agentic/agentEngine';
import { buildExecutionPlan, type ExecutionPlan } from '@/lib/agentic/executionPlanner';
import { summarizeExecution } from '@/lib/agentic/executionSummary';

const readinessColor: Record<string, string> = {
  READY: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  REVIEW: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  BLOCKED: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
};

const riskColor: Record<string, string> = {
  LOW: 'bg-emerald-500/15 text-emerald-600',
  MEDIUM: 'bg-amber-500/15 text-amber-600',
  HIGH: 'bg-orange-500/15 text-orange-600',
  CRITICAL: 'bg-rose-500/15 text-rose-600',
};

export const FounderExecutionCenterPage: React.FC = () => {
  const opsQuery = useLiveOpsMetrics();
  const storageHook = useStorageMetrics();
  const enterpriseQuery = useLiveEnterpriseMetrics();

  const executions: ExecutionPlan[] = useMemo(() => {
    const ops = opsQuery.data;
    const storage = storageHook.data;
    const enterprise = enterpriseQuery.data;
    const totalBytes = storage?.totals.bytes ?? 0;
    const softLimit = 5 * 1024 * 1024 * 1024;
    const metrics = {
      storagePct: totalBytes > 0 ? Math.min(100, (totalBytes / softLimit) * 100) : null,
      storageGrowthGbPerDay: (storage?.forecast.dailyBytes ?? 0) / (1024 * 1024 * 1024),
      workerSuccessRate: ops?.queue.successRate ?? null,
      queueDepth: ops?.queue.depth ?? 0,
      dlq: ops?.queue.dlq ?? 0,
      rpcP95Ms: null as number | null,
      liveSourceOk: enterprise?.source === 'live' ? 1 : 0.5,
    };
    const proposals = proposeAll(metrics, {
      isFounder: true,
      isSuperAdmin: true,
      quietHours: false,
      changeFreezeActive: false,
    } as unknown as Parameters<typeof proposeAll>[1]);
    return proposals.map((p) => buildExecutionPlan(p.plan));
  }, [opsQuery.data, storageHook.data, enterpriseQuery.data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = executions.find((e) => e.planId === selectedId) ?? executions[0] ?? null;

  const totals = useMemo(() => {
    if (executions.length === 0) return { total: 0, ready: 0, blocked: 0, avgConfidence: 0 };
    return {
      total: executions.length,
      ready: executions.filter((e) => e.readiness === 'READY').length,
      blocked: executions.filter((e) => e.readiness === 'BLOCKED').length,
      avgConfidence: Math.round(
        executions.reduce((s, e) => s + e.estimate.confidence, 0) / executions.length,
      ),
    };
  }, [executions]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" /> Execution Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Camada consultiva — transforma planos aprovados em workflows executáveis.
            Nenhuma ação é executada automaticamente.
          </p>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary">
          Founder Only · Advisory
        </Badge>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Planos executáveis</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{totals.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Prontos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-600">{totals.ready}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Bloqueados</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-rose-600">{totals.blocked}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Confiança média</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{totals.avgConfidence}%</CardContent>
        </Card>
      </div>

      {executions.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Sem problemas detectados no momento. Métricas dentro dos limites operacionais.
          </CardContent>
        </Card>
      )}

      {executions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-sm">Workflows candidatos</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {executions.map((e) => (
                <button
                  key={e.planId}
                  onClick={() => setSelectedId(e.planId)}
                  className={`w-full text-left rounded-lg border p-3 transition ${
                    selected?.planId === e.planId ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{e.source.problem.title}</span>
                    <Badge className={readinessColor[e.readiness]} variant="outline">{e.readiness}</Badge>
                  </div>
                  <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                    <span className={`px-1.5 py-0.5 rounded ${riskColor[e.risk.level]}`}>{e.risk.level}</span>
                    <span>{e.estimate.avgMinutes} min</span>
                    <span>{e.estimate.complexity}</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {selected && (
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs flex items-center gap-1"><Sparkles className="h-3 w-3" /> Execution Readiness</CardTitle></CardHeader>
                  <CardContent><Badge className={readinessColor[selected.readiness]} variant="outline">{selected.readiness}</Badge></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Risk</CardTitle></CardHeader>
                  <CardContent><Badge className={riskColor[selected.risk.level]} variant="outline">{selected.risk.level} · {selected.risk.score}</Badge></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs flex items-center gap-1"><Timer className="h-3 w-3" /> Tempo</CardTitle></CardHeader>
                  <CardContent className="text-sm font-semibold">{selected.estimate.minMinutes}–{selected.estimate.maxMinutes} min</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs">Workflow Score</CardTitle></CardHeader>
                  <CardContent className="text-sm font-semibold">{selected.validation.score}/100</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Rollback</CardTitle></CardHeader>
                  <CardContent className="text-sm font-semibold">{selected.rollback.readiness} ({selected.rollback.steps.length})</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs">Confidence</CardTitle></CardHeader>
                  <CardContent className="text-sm font-semibold">{selected.estimate.confidence}%</CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4" /> Caminho crítico</CardTitle></CardHeader>
                <CardContent>
                  <ol className="space-y-1 text-xs text-muted-foreground">
                    {selected.graph.criticalPath.map((id, i) => {
                      const node = selected.graph.nodes.find((n) => n.id === id);
                      return (
                        <li key={id} className="flex items-center gap-2">
                          <span className="w-6 text-right">{i + 1}.</span>
                          <span className="font-medium text-foreground">{node?.label ?? id}</span>
                          <span className="ml-auto">{node?.kind}</span>
                        </li>
                      );
                    })}
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Resumo executivo</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  {(() => {
                    const s = summarizeExecution(selected);
                    return (
                      <>
                        <p className="font-semibold">{s.headline}</p>
                        <p><span className="text-muted-foreground">Tempo:</span> {s.time}</p>
                        <p><span className="text-muted-foreground">Risco:</span> {s.risk}</p>
                        <p><span className="text-muted-foreground">Complexidade:</span> {s.complexity}</p>
                        <p><span className="text-muted-foreground">Impacto:</span> {s.impact}</p>
                        <p><span className="text-muted-foreground">Plano:</span> {s.planOverview}</p>
                        <p><span className="text-muted-foreground">Rollback:</span> {s.rollbackOverview}</p>
                        <p className="pt-1 text-primary font-medium">{s.recommendation}</p>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              {selected.validation.issues.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Validation gates</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-xs">
                    {selected.validation.issues.map((i) => (
                      <div key={i.code} className="flex items-center gap-2">
                        <Badge variant="outline">{i.severity}</Badge>
                        <span>{i.message}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end">
                <Button variant="outline" disabled title="Execução manual desabilitada — Founder approval na próxima sprint">
                  Encaminhar para aprovação (em breve)
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FounderExecutionCenterPage;
