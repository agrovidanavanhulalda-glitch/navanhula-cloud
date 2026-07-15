import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Gavel, AlertTriangle, ClipboardCheck, Scale, Activity } from 'lucide-react';
import { buildPolicyReport } from '@/lib/agentic/policySummary';

const statusColor: Record<string, string> = {
  COMPLIANT: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  WARNING: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  NON_COMPLIANT: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  BLOCKED: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
};
const decisionColor: Record<string, string> = {
  APPROVE: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  APPROVE_WITH_CONDITIONS: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
  REQUEST_REVIEW: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  REJECT: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  BLOCK: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
};

export const FounderPolicyCenterPage: React.FC = () => {
  const report = useMemo(() =>
    buildPolicyReport({
      risk: 55, complexity: 60, durationMinutes: 180, cost: 750,
      rollbackReadiness: 70, approvals: 1, unresolvedDependencies: 0,
      governanceScore: 72, knowledgeConfidence: 65, simulationScore: 68, decisionScore: 66,
      hasAuditTrail: true, hasVersionHistory: true, hasApprovalRecord: true, hasTraceability: true,
    }),
  []);

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Enterprise Policy Center
            <Badge variant="outline" className="ml-auto">Founder · Read-only</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>{report.executiveSummary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ScoreCard icon={<Gavel className="h-4 w-4" />} label="Policy Score" value={report.policyScore.score} badge={report.policyScore.rating} />
        <ScoreCard icon={<ClipboardCheck className="h-4 w-4" />} label="Compliance" value={report.compliance.score} badge={report.compliance.status} color={statusColor[report.compliance.status]} />
        <ScoreCard icon={<Scale className="h-4 w-4" />} label="Governance" value={report.governance.score} badge={report.governance.rating} />
        <ScoreCard icon={<AlertTriangle className="h-4 w-4" />} label="Violations" value={report.violations.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Executive Decision
            <Badge variant="outline" className={`ml-auto ${decisionColor[report.recommendation.decision]}`}>
              {report.recommendation.decision}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>{report.recommendation.justification}</p>
          {report.recommendation.conditions.length > 0 && (
            <div>
              <p className="text-foreground font-semibold">Condições:</p>
              <ul className="list-disc pl-4 space-y-1">
                {report.recommendation.conditions.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Policy Matrix</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2 pr-3">Política</th>
                <th className="text-left py-2 px-3">Severidade</th>
                <th className="text-right py-2 px-3">Valor</th>
                <th className="text-right py-2 px-3">Limite</th>
                <th className="text-left py-2 pl-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.evaluations.map((e) => (
                <tr key={e.policy.id} className="border-b border-border/40">
                  <td className="py-2 pr-3 font-medium">{e.policy.label}</td>
                  <td className="px-3">{e.policy.severity}</td>
                  <td className="text-right px-3">{e.value}</td>
                  <td className="text-right px-3">{e.policy.operator === 'lte' ? '≤' : '≥'} {e.policy.threshold}</td>
                  <td className="pl-3">
                    <Badge variant="outline" className={statusColor[e.status]}>{e.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Risk Matrix</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            {report.riskMatrix.map((r) => (
              <div key={r.severity} className="flex justify-between border-b border-border/40 py-1">
                <span>{r.severity}</span>
                <span className="font-semibold text-foreground">{r.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Violações Detectadas</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            {report.violations.length === 0
              ? <p>Nenhuma violação. Plano em total conformidade.</p>
              : report.violations.map((v) => (
                  <div key={v.policyId} className="border-b border-border/40 pb-2">
                    <p className="text-foreground font-semibold">{v.label} <Badge variant="outline" className={statusColor[v.status]}>{v.status}</Badge></p>
                    <p>{v.reason}</p>
                    <p className="text-xs">→ {v.recommendation}</p>
                  </div>
                ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ScoreCard: React.FC<{ icon: React.ReactNode; label: string; value: number; badge?: string; color?: string }> = ({ icon, label, value, badge, color }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        {icon}{label}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-black">{value}</div>
      {badge && <Badge variant="outline" className={`mt-1 ${color ?? ''}`}>{badge}</Badge>}
    </CardContent>
  </Card>
);

export default FounderPolicyCenterPage;
