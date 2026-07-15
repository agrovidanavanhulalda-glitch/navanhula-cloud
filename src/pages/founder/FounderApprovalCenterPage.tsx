import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Clock, GitCompare, MessageSquare, History, ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  listWorkflows,
  transitionStatus,
  workflowDetail,
  expireStale,
  type ApprovalStatus,
} from '@/lib/agentic/approvalWorkflow';
import { addComment } from '@/lib/agentic/commentEngine';
import { buildTimeline } from '@/lib/agentic/approvalHistory';
import { diffVersions } from '@/lib/agentic/planDiffEngine';
import { toast } from '@/hooks/use-toast';
import { updateAgenticStatus } from '@/lib/agentic/agenticAuditService';

const statusColor: Record<ApprovalStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  APPROVED: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  REJECTED: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  CANCELLED: 'bg-muted text-muted-foreground border-border',
  EXPIRED: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
};

export const FounderApprovalCenterPage: React.FC = () => {
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const workflows = useMemo(() => {
    expireStale();
    return listWorkflows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const selected = useMemo(() => {
    const id = selectedId ?? workflows[0]?.workflowId ?? null;
    return id ? workflowDetail(id) : null;
  }, [selectedId, workflows]);

  const totals = useMemo(() => {
    return {
      total: workflows.length,
      pending: workflows.filter((w) => w.status === 'PENDING').length,
      approved: workflows.filter((w) => w.status === 'APPROVED').length,
      rejected: workflows.filter((w) => w.status === 'REJECTED').length,
      expired: workflows.filter((w) => w.status === 'EXPIRED').length,
    };
  }, [workflows]);

  const actor = user?.email ?? 'founder';

  const handleAction = async (status: ApprovalStatus) => {
    if (!selected?.workflow) return;
    const wf = transitionStatus(selected.workflow.workflowId, status, actor, comment || undefined);
    if (wf?.auditId) {
      await updateAgenticStatus(wf.auditId, status as unknown as 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED', {
        actor,
        reason: comment,
      });
    }
    toast({ title: `Workflow ${status}`, description: wf?.problemTitle ?? '' });
    setComment('');
    refresh();
  };

  const handleComment = () => {
    if (!selected?.workflow || !comment.trim()) return;
    addComment(selected.workflow.workflowId, { author: actor, action: 'COMMENT', message: comment });
    setComment('');
    refresh();
  };

  const diff = useMemo(() => {
    const versions = selected?.versions ?? [];
    if (versions.length < 2) return null;
    return diffVersions(versions[versions.length - 2], versions[versions.length - 1]);
  }, [selected]);

  const timeline = useMemo(() => (selected?.workflow ? buildTimeline(selected.workflow.workflowId) : []), [selected]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" /> Approval Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Human-in-the-Loop — Founder aprova, revisa ou rejeita planos Agentic. Nenhuma ação é executada.
          </p>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary">Founder Only · Advisory</Badge>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.total}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pendentes</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-amber-600">{totals.pending}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Aprovados</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-emerald-600">{totals.approved}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Rejeitados</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-rose-600">{totals.rejected}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Expirados</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-slate-600">{totals.expired}</CardContent></Card>
      </div>

      {workflows.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhum workflow submetido ainda. Use o Execution Center e clique em "Enviar para aprovação".
        </CardContent></Card>
      )}

      {workflows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-sm">Workflows</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {workflows.map((w) => (
                <button
                  key={w.workflowId}
                  onClick={() => setSelectedId(w.workflowId)}
                  className={`w-full text-left rounded-lg border p-3 transition ${
                    selected?.workflow?.workflowId === w.workflowId ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{w.problemTitle}</span>
                    <Badge className={statusColor[w.status]} variant="outline">{w.status}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>v{w.currentVersion}</span>
                    <span>risco {w.riskScore}</span>
                    <span>exec {w.executionScore}</span>
                    <span>conf {w.confidence}%</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {selected?.workflow && (
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">{selected.workflow.problemTitle}</CardTitle>
                  <Badge className={statusColor[selected.workflow.status]} variant="outline">{selected.workflow.status}</Badge>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Versão</div><div className="font-semibold">v{selected.workflow.currentVersion}</div></div>
                  <div><div className="text-xs text-muted-foreground">Risco</div><div className="font-semibold">{selected.workflow.riskScore}/100</div></div>
                  <div><div className="text-xs text-muted-foreground">Execução</div><div className="font-semibold">{selected.workflow.executionScore}/100</div></div>
                  <div><div className="text-xs text-muted-foreground">Rollback</div><div className="font-semibold">{selected.workflow.rollbackScore}/100</div></div>
                  <div><div className="text-xs text-muted-foreground">Confiança</div><div className="font-semibold">{selected.workflow.confidence}%</div></div>
                  <div><div className="text-xs text-muted-foreground">Criado</div><div className="font-semibold">{new Date(selected.workflow.createdAt).toLocaleString()}</div></div>
                  <div><div className="text-xs text-muted-foreground">Atualizado</div><div className="font-semibold">{new Date(selected.workflow.updatedAt).toLocaleString()}</div></div>
                  <div><div className="text-xs text-muted-foreground">Expira</div><div className="font-semibold">{new Date(selected.workflow.expiresAt).toLocaleString()}</div></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Comentário / Decisão</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Observação do Founder (opcional para aprovar/rejeitar)" rows={3} />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => handleAction('APPROVED')} disabled={selected.workflow.status !== 'PENDING'}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleAction('REJECTED')} disabled={selected.workflow.status !== 'PENDING'}>
                      <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAction('CANCELLED')} disabled={selected.workflow.status !== 'PENDING'}>
                      Cancelar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleComment} disabled={!comment.trim()}>
                      Comentar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {diff && (
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><GitCompare className="h-4 w-4" /> Diff v{diff.fromVersion} → v{diff.toVersion}</CardTitle></CardHeader>
                  <CardContent className="text-xs space-y-1">
                    <p className="text-muted-foreground">{diff.summary}</p>
                    {diff.changed.slice(0, 12).map((c) => (
                      <div key={c.field} className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{c.field}</Badge>
                        <span className="text-muted-foreground">{String(c.before)}</span>
                        <span>→</span>
                        <span className="font-semibold">{String(c.after)}</span>
                        {typeof c.delta === 'number' && (
                          <span className={c.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            ({c.delta >= 0 ? '+' : ''}{c.delta})
                          </span>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" /> Timeline</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {timeline.length === 0 && <p className="text-muted-foreground">Sem eventos.</p>}
                  {timeline.map((e, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Clock className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <div className="font-medium">{e.title}</div>
                        <div className="text-muted-foreground">{e.detail}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(e.at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FounderApprovalCenterPage;
