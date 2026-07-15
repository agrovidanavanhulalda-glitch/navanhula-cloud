import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, ShieldAlert, Target } from 'lucide-react';
import { normalizeDecisions, type DecisionCandidateInput } from '@/lib/agentic/decisionIntelligenceEngine';
import { buildDecisionSummary } from '@/lib/agentic/decisionSummaryEngine';
import { estimateAllImpacts } from '@/lib/agentic/decisionImpactEngine';
import { assessRisks } from '@/lib/agentic/decisionRiskEngine';
import { evaluateConfidence } from '@/lib/agentic/decisionConfidenceEngine';
import { computeConsensus } from '@/lib/agentic/decisionConsensusEngine';
import { estimateTimelines } from '@/lib/agentic/decisionTimelineEngine';

/**
 * Sprint 4.9 · Decision Center — Founder-only, read-only.
 * Consultative synthesis derived from existing agentic layers.
 */

const SEED: DecisionCandidateInput[] = [
  { id: 'D-001', title: 'Escalar workers de sincronização', source: 'operations', impact: 82, confidence: 78, risk: 25, cost: 40, urgency: 80, benefit: 78, effortHours: 24 },
  { id: 'D-002', title: 'Habilitar FinOps auto-rightsizing', source: 'finops', impact: 65, confidence: 70, risk: 30, cost: 20, urgency: 55, benefit: 72, effortHours: 40 },
  { id: 'D-003', title: 'Reforçar RLS em relatórios fiscais', source: 'governance', impact: 88, confidence: 92, risk: 15, cost: 30, urgency: 90, benefit: 85, effortHours: 16 },
  { id: 'D-004', title: 'Ampliar cobertura de simulação de decisões', source: 'simulation', impact: 55, confidence: 60, risk: 25, cost: 35, urgency: 45, benefit: 60, effortHours: 80 },
  { id: 'D-005', title: 'Retreinar modelo preditivo de estoque', source: 'knowledge', impact: 70, confidence: 55, risk: 45, cost: 55, urgency: 60, benefit: 68, effortHours: 60 },
  { id: 'D-006', title: 'Retirar hotfix experimental de billing', source: 'approval', impact: 40, confidence: 35, risk: 85, cost: 20, urgency: 70, benefit: 35, effortHours: 12 },
];

const Stat: React.FC<{ label: string; value: string | number; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-xl border border-border/60 bg-card p-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
    <div className="mt-1 text-2xl font-bold">{value}</div>
  </div>
);

export const FounderDecisionCenterPage: React.FC = () => {
  const list = useMemo(() => normalizeDecisions(SEED), []);
  const summary = useMemo(() => buildDecisionSummary(list), [list]);
  const impacts = useMemo(() => estimateAllImpacts(list), [list]);
  const risks = useMemo(() => assessRisks(list), [list]);
  const confidences = useMemo(() => evaluateConfidence(list), [list]);
  const consensus = useMemo(() => computeConsensus(list), [list]);
  const timelines = useMemo(() => estimateTimelines(list), [list]);

  const byId = <T extends { id: string }>(arr: T[]) => new Map(arr.map((x) => [x.id, x]));
  const impactMap = byId(impacts);
  const riskMap = byId(risks);
  const confMap = byId(confidences);
  const consMap = byId(consensus);
  const tlMap = byId(timelines);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black">Decision Center</h2>
            <p className="text-xs text-muted-foreground">
              Camada consultiva de Decision Intelligence · read-only
            </p>
          </div>
        </div>
        <Badge variant="secondary">Human-in-the-Loop</Badge>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Decisões" value={summary.total} icon={<Target className="h-3.5 w-3.5" />} />
        <Stat label="Saúde" value={`${summary.health.score} · ${summary.health.rating}`} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <Stat label="P0 Críticas" value={summary.portfolio.distribution.P0} icon={<ShieldAlert className="h-3.5 w-3.5" />} />
        <Stat label="Score médio" value={summary.portfolio.avgScore} />
      </div>

      {summary.headlines.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Headlines</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {summary.headlines.map((h, i) => (
              <Badge key={i} variant="outline">{h}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Top 10 Prioridades</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {summary.top10.map((p) => {
              const src = list.find((d) => d.id === p.id);
              const exec = summary.executive.find((e) => e.id === p.id);
              return (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/50 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{src?.title ?? p.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {src?.source} · risco {riskMap.get(p.id)?.level} · confiança {confMap.get(p.id)?.level} · consenso {consMap.get(p.id)?.verdict} · {tlMap.get(p.id)?.estimatedHours}h
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{p.band}</Badge>
                    <Badge>{p.priorityScore}</Badge>
                    {exec && <Badge variant="secondary">{exec.recommendation}</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Decision Matrix</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="p-2 text-left">Decisão</th>
                  <th className="p-2 text-right">Impacto</th>
                  <th className="p-2 text-right">Confiança</th>
                  <th className="p-2 text-right">Risco</th>
                  <th className="p-2 text-right">Consenso</th>
                  <th className="p-2 text-right">Recomendação</th>
                </tr>
              </thead>
              <tbody>
                {summary.executive.map((e) => (
                  <tr key={e.id} className="border-t border-border/40">
                    <td className="p-2 font-medium">{e.title}</td>
                    <td className="p-2 text-right">{impactMap.get(e.id)?.overall}</td>
                    <td className="p-2 text-right">{confMap.get(e.id)?.confidence}</td>
                    <td className="p-2 text-right">{riskMap.get(e.id)?.risk}</td>
                    <td className="p-2 text-right">{consMap.get(e.id)?.agreement}</td>
                    <td className="p-2 text-right"><Badge variant="outline">{e.recommendation}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Camada 100% consultiva. Nenhuma ação é executada automaticamente. Todas as recomendações
        requerem aprovação humana (Human-in-the-Loop).
      </p>
    </div>
  );
};

export default FounderDecisionCenterPage;
