import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles, TrendingUp, AlertTriangle, GitBranch, Clock, Trophy, Lightbulb } from 'lucide-react';
import { listWorkflows } from '@/lib/agentic/approvalWorkflow';
import { fetchAgenticAudit } from '@/lib/agentic/agenticAuditService';
import { buildKnowledgeReport, type KnowledgeReport } from '@/lib/agentic/knowledgeEngine';

const ratingColor: Record<string, string> = {
  POOR: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  FAIR: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  GOOD: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
  VERY_GOOD: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  EXCELLENT: 'bg-primary/15 text-primary border-primary/30',
};

export const FounderKnowledgeCenterPage: React.FC = () => {
  const [report, setReport] = useState<KnowledgeReport | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const workflows = listWorkflows();
      let audit: Awaited<ReturnType<typeof fetchAgenticAudit>>['rows'] = [];
      try {
        const res = await fetchAgenticAudit({ pageSize: 200 });
        audit = res.rows;
      } catch {
        audit = [];
      }
      if (!alive) return;
      setReport(buildKnowledgeReport({ workflows, audit }));
    })();
    return () => {
      alive = false;
    };
  }, []);

  const r = report;

  const stat = useMemo(
    () => [
      { label: 'Knowledge Score', value: r ? `${r.score.score}` : '—', hint: r?.score.rating ?? '' },
      { label: 'Learning Score', value: r ? `${r.learning.learningScore}` : '—' },
      { label: 'Memory Size', value: r ? `${r.memory.memorySize}` : '—' },
      { label: 'Success Rate', value: r ? `${r.learning.successRate}%` : '—' },
      { label: 'Approval Rate', value: r ? `${r.learning.approvalRate}%` : '—' },
      { label: 'Confidence', value: r ? `${r.learning.avgConfidence}%` : '—' },
    ],
    [r],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> Knowledge Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Aprendizado consultivo baseado no histórico Agentic. Nenhuma ação é executada.
          </p>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary">Founder Only · Read Only</Badge>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stat.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{s.label}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              {s.hint && <Badge className={ratingColor[s.hint] ?? ''} variant="outline">{s.hint.replace('_', ' ')}</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>

      {r && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4" /> Resumo Executivo</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{r.summary.summary}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">Maturidade: {r.summary.maturity}</Badge>
                <Badge variant="outline">Tendência: {r.summary.trend}</Badge>
                <Badge variant="outline">Confiança: {r.summary.confidence}%</Badge>
              </div>
              {r.summary.alerts.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Alertas</div>
                  <ul className="list-disc pl-5 space-y-1">
                    {r.summary.alerts.map((a, i) => <li key={i} className="text-xs">{a}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Top Recomendações</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              {r.recommendations.length === 0 && <p className="text-muted-foreground">Sem recomendações — base equilibrada.</p>}
              {r.recommendations.slice(0, 8).map((rec) => (
                <div key={rec.id} className="rounded border border-border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{rec.title}</span>
                    <Badge variant="outline">{rec.priority}</Badge>
                  </div>
                  <p className="text-muted-foreground">{rec.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4" /> Top Padrões</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {r.insights.topPatterns.length === 0 && <p className="text-muted-foreground">Ainda sem padrões detectados.</p>}
              {r.insights.topPatterns.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-2 rounded border border-border p-2">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-muted-foreground">{p.detail}</div>
                  </div>
                  <Badge variant="outline">{p.kind}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Top Riscos</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {r.insights.topRisks.map((g) => (
                <div key={g.key} className="flex items-center justify-between rounded border border-border p-2">
                  <span className="font-medium truncate">{g.title}</span>
                  <span className="text-muted-foreground">risco {g.avgRisk}/100 · {g.size}x</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4" /> Top Sucessos</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {r.insights.topSuccesses.map((g) => (
                <div key={g.key} className="flex items-center justify-between rounded border border-border p-2">
                  <span className="font-medium truncate">{g.title}</span>
                  <span className="text-muted-foreground">{g.approved} aprovados</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Evolução do Conhecimento</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {r.evolution.length === 0 && <p className="text-muted-foreground">Sem dados temporais.</p>}
              {r.evolution.slice(-10).map((e) => (
                <div key={e.bucket} className="flex items-center justify-between rounded border border-border p-2">
                  <span className="font-medium">{e.bucket}</span>
                  <span className="text-muted-foreground">total {e.count} · ✔ {e.approved} · ✖ {e.rejected}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline de Decisões</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {r.timeline.length === 0 && <p className="text-muted-foreground">Sem decisões ainda.</p>}
              {r.timeline.slice(0, 20).map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded border border-border p-2">
                  <span className="truncate">{e.title}</span>
                  <span className="text-muted-foreground">{e.status} · {new Date(e.at).toLocaleString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FounderKnowledgeCenterPage;
