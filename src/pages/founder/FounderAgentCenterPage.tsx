/**
 * Sprint 4.0 · Founder Agent Center (READ-ONLY, ADVISORY).
 * Surfaces agentic proposals derived from live metrics.
 * Never executes actions. All approvals stay local to this session.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, ShieldCheck, ShieldAlert, ClipboardList, Undo2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveOpsMetrics } from '@/lib/ops/useLiveOpsMetrics';
import { useLiveEnterpriseMetrics } from '@/lib/ops/useLiveEnterpriseMetrics';
import { useStorageMetrics } from '@/lib/ops/useStorageMetrics';
import { proposeAll, summarize, type AgenticProposal } from '@/lib/agentic/agentEngine';
import { transition, type ApprovalRecord, type ApprovalState } from '@/lib/agentic/approvalEngine';
import { buildAuditEntry, type AuditEntry } from '@/lib/agentic/auditEngine';
import { LiveSourceBadge } from '@/components/founder/LiveSourceBadge';

const stateBadge: Record<ApprovalState, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  PENDING: 'bg-yellow-500 text-black',
  APPROVED: 'bg-emerald-500 text-white',
  REJECTED: 'bg-destructive text-destructive-foreground',
  CANCELLED: 'bg-muted text-muted-foreground',
  EXECUTED: 'bg-primary text-primary-foreground',
  EXPIRED: 'bg-muted text-muted-foreground',
};

const sevBadge: Record<string, string> = {
  CRITICAL: 'bg-destructive text-destructive-foreground',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-yellow-500 text-black',
  LOW: 'bg-muted text-muted-foreground',
};

export const FounderAgentCenterPage: React.FC = () => {
  const { isFounder, isMaster, user } = useAuth();
  const live = useLiveOpsMetrics();
  const enterprise = useLiveEnterpriseMetrics();
  const storage = useStorageMetrics();

  const okSources =
    (live.data?.source === 'live' ? 1 : live.data?.source === 'degraded' ? 0.5 : 0) +
    (enterprise.data?.source === 'live' ? 1 : enterprise.data?.source === 'degraded' ? 0.5 : 0) +
    (storage.data?.source === 'live' ? 1 : storage.data?.source === 'degraded' ? 0.5 : 0);
  const dataQuality = okSources / 3;

  const storageGb = (storage.data?.totals.bytes ?? 0) / (1024 ** 3);
  const storageGrowthGbPerDay = (storage.data?.forecast.dailyBytes ?? 0) / (1024 ** 3);
  // Rough operational pressure: based on aggregate bytes vs a conservative soft cap (100 GB).
  const softCapGb = 100;
  const storagePct = storageGb > 0 ? Math.min(100, (storageGb / softCapGb) * 100) : null;

  const proposals = React.useMemo(
    () =>
      proposeAll(
        {
          storagePct,
          storageGrowthGbPerDay,
          workerSuccessRate: live.data?.queue.successRate ?? null,
          queueDepth: live.data?.queue.depth ?? 0,
          dlq: live.data?.queue.dlq ?? 0,
          rpcP95Ms: live.data?.rpc.p95 ?? null,
          liveSourceOk: dataQuality,
        },
        {
          isFounder: !!isFounder,
          isSuperAdmin: !!isMaster,
          now: new Date(),
          maintenanceWindow: null,
        },
      ),
    [live.data, storagePct, storageGrowthGbPerDay, dataQuality, isFounder, isMaster],
  );

  const [approvals, setApprovals] = React.useState<Record<string, ApprovalRecord>>({});
  const [audit, setAudit] = React.useState<AuditEntry[]>([]);

  React.useEffect(() => {
    setApprovals((prev) => {
      const next = { ...prev };
      for (const p of proposals) if (!next[p.plan.id]) next[p.plan.id] = p.approval;
      return next;
    });
  }, [proposals]);

  const actor = user?.email ?? 'founder';

  const act = (proposal: AgenticProposal, target: ApprovalState, reason: string) => {
    const current = approvals[proposal.plan.id] ?? proposal.approval;
    try {
      const next = transition(current, target, actor, reason);
      setApprovals((prev) => ({ ...prev, [proposal.plan.id]: next }));
      setAudit((prev) => [
        buildAuditEntry(proposal.plan, next, actor, target, reason),
        ...prev,
      ].slice(0, 50));
    } catch (e) {
      // invalid transition — silently ignore in advisory mode
    }
  };

  const summary = summarize(proposals);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Agent Center</h2>
            <p className="text-sm text-muted-foreground">
              Camada Agentic consultiva. A IA sugere planos — nenhuma ação é executada sem sua aprovação.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LiveSourceBadge source={live.data?.source ?? 'offline'} />
          <LiveSourceBadge source={enterprise.data?.source ?? 'offline'} />
          <LiveSourceBadge source={storage.data?.source ?? 'offline'} />
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Propostas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Críticas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{summary.critical}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Altas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-500">{summary.high}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Confiança média</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.avgConfidence}%</div></CardContent></Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Readiness</CardTitle></CardHeader>
          <CardContent>
            <Badge className={summary.readiness === 'READY' ? 'bg-emerald-500 text-white' : summary.readiness === 'REVIEW' ? 'bg-yellow-500 text-black' : 'bg-destructive text-destructive-foreground'}>
              {summary.readiness}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4" /> Planos propostos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {proposals.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum problema detectado nos limites operacionais.</p>
          )}
          {proposals.map((prop) => {
            const approval = approvals[prop.plan.id] ?? prop.approval;
            const canDecide = prop.policy.allowed && approval.state === 'PENDING';
            return (
              <div key={prop.plan.id} className="rounded-xl border border-border/60 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{prop.plan.problem.title}</h3>
                      <Badge className={sevBadge[prop.plan.problem.severity]}>{prop.plan.problem.severity}</Badge>
                      <Badge className={stateBadge[approval.state]}>{approval.state}</Badge>
                      {prop.plan.requiresFounder && (
                        <Badge variant="outline" className="border-primary text-primary">Founder Only</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{prop.plan.problem.description}</p>
                  </div>
                  <div className="text-right text-xs">
                    <div>Confiança: <span className="font-semibold">{prop.plan.score.confidence}%</span></div>
                    <div>Impacto: <span className="font-semibold">{prop.plan.score.impact}</span> · Risco: <span className="font-semibold">{prop.plan.score.risk}</span></div>
                    <div className="text-muted-foreground">≈ {prop.plan.estimatedMinutes} min</div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold mb-1 flex items-center gap-1"><ClipboardList className="h-3 w-3" /> Checklist + Runbook</div>
                    <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                      {[...prop.plan.tasks.checklist, ...prop.plan.tasks.runbook].map((t) => (
                        <li key={t.id}>{t.title} <span className="opacity-70">({t.estimatedMinutes}m)</span></li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold mb-1 flex items-center gap-1"><Undo2 className="h-3 w-3" /> Rollback + Validação</div>
                    <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                      {[...prop.plan.tasks.rollback, ...prop.plan.tasks.validation].map((t) => (
                        <li key={t.id}>{t.title} <span className="opacity-70">({t.estimatedMinutes}m)</span></li>
                      ))}
                    </ul>
                  </div>
                </div>

                {(prop.policy.reasons.length > 0 || prop.policy.warnings.length > 0) && (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-2 text-xs space-y-1">
                    {prop.policy.reasons.map((r, i) => (
                      <div key={`r${i}`} className="flex items-center gap-1 text-destructive"><ShieldAlert className="h-3 w-3" /> {r}</div>
                    ))}
                    {prop.policy.warnings.map((w, i) => (
                      <div key={`w${i}`} className="flex items-center gap-1 text-yellow-600"><ShieldAlert className="h-3 w-3" /> {w}</div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {approval.state === 'DRAFT' && (
                    <Button size="sm" variant="secondary" onClick={() => act(prop, 'PENDING', 'Submetido para revisão')}>
                      <Clock className="h-3 w-3 mr-1" /> Enviar para aprovação
                    </Button>
                  )}
                  {canDecide && (
                    <>
                      <Button size="sm" onClick={() => act(prop, 'APPROVED', 'Aprovado pelo Founder')}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => act(prop, 'REJECTED', 'Rejeitado pelo Founder')}>
                        <XCircle className="h-3 w-3 mr-1" /> Rejeitar
                      </Button>
                    </>
                  )}
                  {(approval.state === 'DRAFT' || approval.state === 'PENDING' || approval.state === 'APPROVED') && (
                    <Button size="sm" variant="ghost" onClick={() => act(prop, 'CANCELLED', 'Cancelado')}>
                      Cancelar
                    </Button>
                  )}
                  {approval.state === 'APPROVED' && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Aprovado — execução manual continua a cargo do Founder.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Audit Trail (sessão)</CardTitle>
        </CardHeader>
        <CardContent>
          {audit.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma decisão registada ainda.</p>}
          <ul className="space-y-2">
            {audit.map((a) => (
              <li key={a.id} className="rounded-lg border border-border/60 p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono">{new Date(a.timestamp).toLocaleString()}</span>
                  <Badge variant="outline">{a.action}</Badge>
                </div>
                <div className="text-muted-foreground mt-1">
                  {a.actor} · {a.reason} · conf {a.confidence}% · impacto {a.impact} · risco {a.risk}
                  {a.rollbackAvailable && ' · rollback disponível'}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default FounderAgentCenterPage;
