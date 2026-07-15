/**
 * Sprint 4.8 · Founder Governance Center (read-only).
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Compass, ShieldCheck, TrendingUp, AlertTriangle, Gauge, Target } from 'lucide-react';
import { buildGovernanceDashboard } from '@/lib/agentic/governanceDashboardEngine';
import { useLiveEnterpriseMetrics } from '@/lib/ops/useLiveEnterpriseMetrics';

export const FounderGovernanceCenterPage: React.FC = () => {
  const { data: live } = useLiveEnterpriseMetrics(60_000);

  const report = React.useMemo(() => buildGovernanceDashboard({
    opsHealth: 85,
    executionReadiness: 80,
    policyScore: 90,
    approvalCoverage: 75,
    auditCoverage: 82,
    knowledgeScore: 78,
    complianceScore: 88,
    totalCapacity: 100,
    usedCapacity: 65,
    initiatives: [
      { id: 'i1', title: 'Expansão Fiscal', objectiveId: 'o1', impact: 9, confidence: 80, strategicWeight: 9, risk: 3, cost: 5000, effort: 4 } as any,
      { id: 'i2', title: 'Automação POS', objectiveId: 'o2', impact: 8, confidence: 85, strategicWeight: 7, risk: 2, cost: 3000, effort: 3 } as any,
      { id: 'i3', title: 'CRM Insights', objectiveId: 'o1', impact: 6, confidence: 70, strategicWeight: 5, risk: 4, cost: 2000, effort: 2 } as any,
    ],
    objectiveIds: ['o1', 'o2'],
    investments: [
      { id: 'inv1', cost: 5000, benefit: 15000 },
      { id: 'inv2', cost: 3000, benefit: 9000 },
    ],
    benefits: [
      { id: 'b1', expected: 15000, realized: 12000 },
      { id: 'b2', expected: 9000, realized: 8500 },
    ],
    risks: [
      { id: 'r1', probability: 40, impact: 6, mitigated: true },
      { id: 'r2', probability: 60, impact: 7, mitigated: false },
    ],
  }), [live?.fetchedAt]);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Compass className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Governance Center</h2>
          <p className="text-sm text-muted-foreground">
            Strategic Governance & Portfolio Intelligence · 100% consultivo
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={ShieldCheck} label="Governance" value={report.governance.score} sub={report.governance.rating} />
        <MetricCard icon={Gauge} label="Portfolio Health" value={report.health.score} sub={report.health.rating} />
        <MetricCard icon={Target} label="Alignment" value={report.alignment.score} sub={`Cobertura ${report.alignment.coverage}%`} />
        <MetricCard icon={AlertTriangle} label="Risk" value={report.risk.exposure} sub={report.risk.rating} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Sumário Executivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-black">{report.summary.overallScore}</div>
              <div className="text-xs text-muted-foreground">Overall Governance Score</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">{report.summary.verdict}</div>
              <div className="text-xs text-muted-foreground">{report.summary.headline}</div>
            </div>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
            {report.summary.bullets.map((b, i) => (
              <li key={i} className="rounded-md bg-muted/40 px-3 py-2">{b}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Heat Map</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {report.heatmap.map(c => (
                <div key={c.id} className={`rounded-md p-3 text-center ${
                  c.severity === 'low' ? 'bg-emerald-500/15 text-emerald-600' :
                  c.severity === 'medium' ? 'bg-amber-500/15 text-amber-600' :
                  'bg-destructive/15 text-destructive'
                }`}>
                  <div className="text-xs">{c.label}</div>
                  <div className="text-xl font-bold">{c.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Radar Executivo</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.radar.map(r => (
                <li key={r.axis} className="flex items-center gap-3">
                  <span className="w-28 text-sm">{r.axis}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${r.value}%` }} />
                  </div>
                  <span className="text-sm font-mono w-10 text-right">{r.value}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Investment & Benefits</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Stat label="Custo Total" value={report.investment.totalCost.toLocaleString('pt-PT')} />
          <Stat label="Benefício Total" value={report.investment.totalBenefit.toLocaleString('pt-PT')} />
          <Stat label="ROI" value={`${report.investment.roi}%`} />
          <Stat label="Realização" value={`${report.benefits.realizationRate}%`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Initiative Ranking</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left py-1">#</th>
                <th className="text-left">Iniciativa</th>
                <th className="text-right">Value</th>
                <th className="text-right">Cost</th>
                <th className="text-right">Priority</th>
              </tr>
            </thead>
            <tbody>
              {report.ranking.map(r => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="py-2">{r.rank}</td>
                  <td>{r.title}</td>
                  <td className="text-right">{r.value}</td>
                  <td className="text-right">{r.cost.toLocaleString('pt-PT')}</td>
                  <td className="text-right font-semibold">{r.priorityScore}</td>
                </tr>
              ))}
              {report.ranking.length === 0 && (
                <tr><td colSpan={5} className="py-3 text-center text-muted-foreground">Sem iniciativas.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

const MetricCard: React.FC<{ icon: React.ElementType; label: string; value: number; sub: string }> = ({ icon: Icon, label, value, sub }) => (
  <Card className="press-scale">
    <CardHeader className="pb-2">
      <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </CardContent>
  </Card>
);

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-md bg-muted/40 p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-base font-semibold">{value}</div>
  </div>
);

export default FounderGovernanceCenterPage;
