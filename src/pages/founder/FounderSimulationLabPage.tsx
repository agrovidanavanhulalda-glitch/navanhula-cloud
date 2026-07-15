import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FlaskConical, Trophy, Shield, DollarSign, Clock, Gauge, TrendingUp, Sparkles } from 'lucide-react';
import { buildDefaultScenarios } from '@/lib/agentic/scenarioEngine';
import { buildSimulationReport } from '@/lib/agentic/simulationSummary';

const ratingColor: Record<string, string> = {
  REJECT: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  WEAK: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  GOOD: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
  STRONG: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  OPTIMAL: 'bg-primary/15 text-primary border-primary/30',
};

export const FounderSimulationLabPage: React.FC = () => {
  const [base] = useState({
    id: 'base-plan',
    label: 'Plano Atual',
    risk: 45,
    complexity: 55,
    benefit: 70,
    minutes: 90,
    cost: 250,
    rollbackDifficulty: 40,
    confidence: 68,
  });

  const report = useMemo(() => buildSimulationReport(buildDefaultScenarios(base)), [base]);
  const best = report.ranking.best;

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Decision Simulation Lab
            <Badge variant="outline" className="ml-auto">Founder · Read-only</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{report.summary.headline}</p>
          <p>{report.summary.motivation}</p>
          <p className="text-foreground font-semibold">Recomendação: {report.summary.recommendation}</p>
        </CardContent>
      </Card>

      {best && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ScoreCard icon={<Trophy className="h-4 w-4" />} label="Decision Score" value={best.decision.score} rating={best.decision.rating} />
          <ScoreCard icon={<TrendingUp className="h-4 w-4" />} label="Impact" value={Math.round(best.impact.overall)} />
          <ScoreCard icon={<Shield className="h-4 w-4" />} label="Risk" value={Math.round(best.scenario.risk)} />
          <ScoreCard icon={<DollarSign className="h-4 w-4" />} label="Cost Score" value={best.cost.score} />
          <ScoreCard icon={<Gauge className="h-4 w-4" />} label="Confidence" value={Math.round(best.scenario.confidence)} />
          <ScoreCard icon={<Sparkles className="h-4 w-4" />} label="Success Prob" value={Math.round(best.probability.success)} />
          <ScoreCard icon={<Clock className="h-4 w-4" />} label="Timeline (min)" value={best.timeline.expectedMinutes} />
          <ScoreCard icon={<Sparkles className="h-4 w-4" />} label="Approval Prob" value={Math.round(best.probability.approval)} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparison Matrix</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2 pr-3">Cenário</th>
                <th className="text-right py-2 px-3">Decision</th>
                <th className="text-right py-2 px-3">Risk</th>
                <th className="text-right py-2 px-3">Cost</th>
                <th className="text-right py-2 px-3">Min</th>
                <th className="text-right py-2 px-3">Success%</th>
                <th className="text-right py-2 px-3">Impact</th>
                <th className="text-right py-2 pl-3">Conf</th>
              </tr>
            </thead>
            <tbody>
              {report.matrix.map((r) => (
                <tr key={r.id} className="border-b border-border/40">
                  <td className="py-2 pr-3 font-medium">
                    {r.label} <span className="text-xs text-muted-foreground">({r.kind})</span>
                  </td>
                  <td className="text-right px-3">{r.decisionScore}</td>
                  <td className="text-right px-3">{Math.round(r.risk)}</td>
                  <td className="text-right px-3">{r.cost}</td>
                  <td className="text-right px-3">{r.minutes}</td>
                  <td className="text-right px-3">{Math.round(r.successProb)}</td>
                  <td className="text-right px-3">{Math.round(r.impact)}</td>
                  <td className="text-right pl-3">{Math.round(r.confidence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Riscos</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            {report.summary.risks.length
              ? report.summary.risks.map((r, i) => <p key={i}>• {r}</p>)
              : <p>Nenhum risco crítico detectado.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Benefícios</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            {report.summary.benefits.length
              ? report.summary.benefits.map((b, i) => <p key={i}>• {b}</p>)
              : <p>Sem benefícios destacados.</p>}
          </CardContent>
        </Card>
      </div>

      {best && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Executive Recommendation
              <Badge variant="outline" className={ratingColor[best.decision.rating]}>
                {best.decision.rating}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p><strong className="text-foreground">Melhor cenário:</strong> {best.scenario.label}</p>
            <p><strong className="text-foreground">Menor risco:</strong> {report.ranking.lowestRisk?.scenario.label ?? '—'}</p>
            <p><strong className="text-foreground">Menor custo:</strong> {report.ranking.lowestCost?.scenario.label ?? '—'}</p>
            <p><strong className="text-foreground">Maior benefício:</strong> {report.ranking.highestBenefit?.scenario.label ?? '—'}</p>
            <p><strong className="text-foreground">Balanceado:</strong> {report.ranking.balanced?.scenario.label ?? '—'}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const ScoreCard: React.FC<{ icon: React.ReactNode; label: string; value: number; rating?: string }> = ({ icon, label, value, rating }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        {icon}{label}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-black">{value}</div>
      {rating && <Badge variant="outline" className={`mt-1 ${ratingColor[rating] ?? ''}`}>{rating}</Badge>}
    </CardContent>
  </Card>
);

export default FounderSimulationLabPage;
