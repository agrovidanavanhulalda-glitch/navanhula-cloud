/**
 * Sprint 5.3 · Founder Compliance Center (read-only, consultative).
 */
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle, Activity, TrendingUp, ClipboardList, Sparkles } from 'lucide-react';
import { computeComplianceIntelligence } from '@/lib/agentic/compliance/complianceEngine';

const DEMO_NOW = Date.now();
const day = 24 * 60 * 60 * 1000;

const DEMO_INPUT = {
  now: DEMO_NOW,
  rules: [
    { id: 'iso-a5', frameworkId: 'iso27001', name: 'Information Security Policy', implemented: true, evidenceCount: 6, lastReviewedDaysAgo: 45 },
    { id: 'iso-a9', frameworkId: 'iso27001', name: 'Access Control', implemented: true, evidenceCount: 4, lastReviewedDaysAgo: 30 },
    { id: 'gdpr-dpa', frameworkId: 'gdpr', name: 'Data Processing Agreements', implemented: false, evidenceCount: 0, lastReviewedDaysAgo: 400 },
    { id: 'soc2-cc6', frameworkId: 'soc2', name: 'Logical Access', implemented: true, evidenceCount: 3, lastReviewedDaysAgo: 60 },
    { id: 'pci-4', frameworkId: 'pci_dss', name: 'Encryption in transit', implemented: true, evidenceCount: 2, lastReviewedDaysAgo: 90 },
    { id: 'sox-itgc', frameworkId: 'sox', name: 'IT General Controls', implemented: false, evidenceCount: 1, lastReviewedDaysAgo: 200 },
  ],
  controls: [
    { id: 'backup', name: 'Nightly Backup', failuresLast30d: 0, totalRunsLast30d: 30 },
    { id: 'mfa', name: 'MFA Enforcement', failuresLast30d: 2, totalRunsLast30d: 240 },
    { id: 'log-review', name: 'Log Review', failuresLast30d: 4, totalRunsLast30d: 30 },
  ],
  findings: [
    { id: 'f1', title: 'DPA missing for one processor', severity: 'HIGH' as const },
    { id: 'f2', title: 'Quarterly access review overdue', severity: 'MEDIUM' as const },
    { id: 'f3', title: 'Documentation typo', severity: 'LOW' as const, resolvedAt: new Date(DEMO_NOW).toISOString() },
  ],
  snapshots: Array.from({ length: 20 }, (_, i) => ({
    at: new Date(DEMO_NOW - (20 - i) * day).toISOString(),
    score: 62 + i * 1.2,
  })),
  trail: [
    { id: 't1', at: new Date(DEMO_NOW - 1 * day).toISOString(), actor: 'auditor', action: 'review', target: 'iso27001' },
    { id: 't2', at: new Date(DEMO_NOW - 3 * day).toISOString(), actor: 'ceo', action: 'approve', target: 'policy-update' },
    { id: 't3', at: new Date(DEMO_NOW - 7 * day).toISOString(), actor: 'system', action: 'evidence-collected', target: 'backup' },
  ],
};

const statusColor = (s: string) =>
  s === 'COMPLIANT' || s === 'HEALTHY' ? 'text-emerald-500'
  : s === 'PARTIAL' || s === 'WARNING' ? 'text-amber-500'
  : 'text-destructive';

const FounderComplianceCenterPage: React.FC = () => {
  const report = useMemo(() => computeComplianceIntelligence(DEMO_INPUT), []);

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" /> Enterprise Compliance & Audit Intelligence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Camada consultiva · Somente leitura · Determinística · Zero regressão
        </p>
      </header>

      {/* Score + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Enterprise Compliance Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="text-6xl font-black">{report.score.score}</div>
            <Badge className="mt-2" variant="secondary">{report.score.status}</Badge>
            <p className="text-xs text-muted-foreground mt-3">Grade: {report.summary.grade}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold mb-2">{report.summary.headline}</p>
            <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
              {report.summary.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Compliance Dashboard</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Compliant</span><span className="font-bold text-emerald-500">{report.score.compliant}</span></div>
            <div className="flex justify-between"><span>Partial</span><span className="font-bold text-amber-500">{report.score.partial}</span></div>
            <div className="flex justify-between"><span>Non-Compliant</span><span className="font-bold text-destructive">{report.score.nonCompliant}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Audit Findings</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Critical</span><span className="font-bold text-destructive">{report.findingBreakdown.critical}</span></div>
            <div className="flex justify-between"><span>High</span><span className="font-bold text-orange-500">{report.findingBreakdown.high}</span></div>
            <div className="flex justify-between"><span>Medium</span><span className="font-bold text-amber-500">{report.findingBreakdown.medium}</span></div>
            <div className="flex justify-between"><span>Low</span><span className="font-bold text-muted-foreground">{report.findingBreakdown.low}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Internal Controls</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Healthy</span><span className="font-bold text-emerald-500">{report.controlBreakdown.healthy}</span></div>
            <div className="flex justify-between"><span>Warning</span><span className="font-bold text-amber-500">{report.controlBreakdown.warning}</span></div>
            <div className="flex justify-between"><span>Failed</span><span className="font-bold text-destructive">{report.controlBreakdown.failed}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Trend + Forecast */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Compliance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs">
                <tr><th className="text-left">Janela</th><th className="text-right">Média</th><th className="text-right">Δ</th><th className="text-right">Amostras</th></tr>
              </thead>
              <tbody>
                {report.trend.map((t) => (
                  <tr key={t.window} className="border-t border-border/50">
                    <td className="py-1">{t.window}</td>
                    <td className="text-right">{t.average}</td>
                    <td className={`text-right ${t.delta >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>{t.delta >= 0 ? '+' : ''}{t.delta}</td>
                    <td className="text-right">{t.samples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Compliance Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs">
                <tr><th className="text-left">Horizonte</th><th className="text-right">Projetado</th><th className="text-right">Confiança</th></tr>
              </thead>
              <tbody>
                {report.forecast.map((f) => (
                  <tr key={f.horizon} className="border-t border-border/50">
                    <td className="py-1">{f.horizon}</td>
                    <td className="text-right font-bold">{f.projected}</td>
                    <td className="text-right">{Math.round(f.confidence * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Top Gaps + Remediations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Top Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            {report.gaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum gap identificado.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {report.gaps.slice(0, 8).map((g) => (
                  <li key={g.id} className="flex justify-between border-b border-border/40 pb-1">
                    <span>{g.name} <span className="text-xs text-muted-foreground">({g.frameworkId})</span></span>
                    <span className="font-bold text-destructive">{Math.round(g.gap * 100)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /> Remediation Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            {report.remediations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma recomendação necessária.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {report.remediations.slice(0, 8).map((r) => (
                  <li key={r.id} className="border-b border-border/40 pb-1">
                    <div className="flex justify-between">
                      <span className="font-medium">{r.title}</span>
                      <Badge variant={r.priority === 'P1' ? 'destructive' : 'secondary'}>{r.priority}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Impacto: {Math.round(r.impact * 100)}% · Esforço: {Math.round(r.effort * 100)}%
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Audit Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /> Audit Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {report.auditTrail.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem eventos registrados.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {report.auditTrail.map((e) => (
                <li key={e.id} className="flex justify-between border-b border-border/40 pb-1">
                  <span><span className="font-medium">{e.actor}</span> · {e.action} → {e.target}</span>
                  <span className="text-xs text-muted-foreground">{new Date(e.ts).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Camada 100% consultiva · Nenhuma ação executada automaticamente · Human-in-the-Loop obrigatório
      </p>
    </div>
  );
};

export default FounderComplianceCenterPage;
