import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network, Layers, GitBranch, ShieldAlert } from 'lucide-react';
import { analyzeArchitecture } from '@/lib/agentic/enterpriseArchitectureEngine';
import { buildArchitectureSummary } from '@/lib/agentic/architectureSummaryEngine';
import type { CapabilityInput } from '@/lib/agentic/businessCapabilityEngine';

/**
 * Sprint 5.0 · Architecture Center — Founder-only, read-only.
 * Consultative Enterprise Architecture & Business Capability view.
 */

const SEED: CapabilityInput[] = [
  { id: 'CAP-POS', name: 'Point of Sale', domain: 'Sales', boundedContext: 'Commerce', maturity: 4, health: 92, criticality: 95, risk: 18 },
  { id: 'CAP-FISCAL', name: 'Fiscal Engine', domain: 'Finance', boundedContext: 'Finance', maturity: 4, health: 88, criticality: 92, risk: 22, dependsOn: ['CAP-POS'] },
  { id: 'CAP-BILLING', name: 'Billing', domain: 'Finance', boundedContext: 'Finance', maturity: 3, health: 80, criticality: 85, risk: 28, dependsOn: ['CAP-FISCAL'] },
  { id: 'CAP-CRM', name: 'CRM', domain: 'Customer', boundedContext: 'Customer', maturity: 3, health: 78, criticality: 70, risk: 30 },
  { id: 'CAP-INV', name: 'Inventory', domain: 'Operations', boundedContext: 'Operations', maturity: 3, health: 72, criticality: 80, risk: 35, dependsOn: ['CAP-POS'] },
  { id: 'CAP-HR', name: 'HR & Payroll', domain: 'People', boundedContext: 'People', maturity: 2, health: 68, criticality: 55, risk: 40 },
  { id: 'CAP-AI', name: 'AI Insights', domain: 'Intelligence', boundedContext: 'Intelligence', maturity: 2, health: 65, criticality: 60, risk: 45, dependsOn: ['CAP-CRM', 'CAP-INV'] },
  { id: 'CAP-GOV', name: 'Governance', domain: 'Compliance', boundedContext: 'Governance', maturity: 3, health: 82, criticality: 88, risk: 25 },
];

const Stat: React.FC<{ label: string; value: string | number; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-xl border border-border/60 bg-card p-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
    <div className="mt-1 text-2xl font-bold">{value}</div>
  </div>
);

export const FounderArchitectureCenterPage: React.FC = () => {
  const report = useMemo(() => analyzeArchitecture(SEED), []);
  const summary = useMemo(() => buildArchitectureSummary(report), [report]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black">Architecture Center</h2>
            <p className="text-xs text-muted-foreground">
              Enterprise Architecture & Business Capability · read-only
            </p>
          </div>
        </div>
        <Badge variant="secondary">Human-in-the-Loop</Badge>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Capabilities" value={summary.totals.capabilities} icon={<Layers className="h-3.5 w-3.5" />} />
        <Stat label="Domínios" value={summary.totals.domains} icon={<GitBranch className="h-3.5 w-3.5" />} />
        <Stat label="Score" value={`${summary.score} · ${summary.rating}`} />
        <Stat label="Riscos críticos" value={summary.totals.criticalRisks} icon={<ShieldAlert className="h-3.5 w-3.5" />} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Headlines</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {summary.highlights.map((h, i) => <Badge key={i} variant="outline">{h}</Badge>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Capability Heatmap</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {report.map.heatmap.map((h) => (
              <div key={h.id} className="rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="text-xs text-muted-foreground">{h.domain}</div>
                <div className="text-sm font-semibold truncate">{h.name}</div>
                <div className="mt-1">
                  <Badge variant={h.heat >= 70 ? 'destructive' : h.heat >= 40 ? 'default' : 'outline'}>
                    heat {h.heat}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Domínios</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="p-2 text-left">Domínio</th>
                  <th className="p-2 text-right">Capabilities</th>
                  <th className="p-2 text-right">Saúde</th>
                  <th className="p-2 text-right">Maturidade</th>
                  <th className="p-2 text-right">Risco</th>
                </tr>
              </thead>
              <tbody>
                {report.domains.map((d) => (
                  <tr key={d.domain} className="border-t border-border/40">
                    <td className="p-2 font-medium">{d.domain}</td>
                    <td className="p-2 text-right">{d.capabilities}</td>
                    <td className="p-2 text-right">{d.avgHealth}</td>
                    <td className="p-2 text-right">{d.avgMaturity}</td>
                    <td className="p-2 text-right">{d.avgRisk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Bounded Contexts</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {report.boundedContexts.map((bc) => (
            <div key={bc.name} className="rounded-lg border border-border/60 bg-card/50 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{bc.name}</div>
                <Badge variant="outline">{bc.size} caps</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                domínio {bc.domain} · coesão {bc.cohesion} · acoplamento {bc.coupling}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Roadmap Arquitetural</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {report.roadmap.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground">prioridade {r.priority}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{r.horizon}</Badge>
                  <Badge>{r.action}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Camada 100% consultiva. Nenhuma ação é executada. Todas as recomendações
        exigem aprovação humana (Human-in-the-Loop).
      </p>
    </div>
  );
};

export default FounderArchitectureCenterPage;
