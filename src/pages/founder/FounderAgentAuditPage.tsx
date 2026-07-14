import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Bot, Download, RefreshCcw, ShieldCheck } from 'lucide-react';
import {
  fetchAgenticAudit,
  summarizeAudit,
  type AgenticAuditFilters,
  type AgenticSeverity,
  type AgenticStatus,
} from '@/lib/agentic/agenticAuditService';

const SEVERITY_STYLES: Record<AgenticSeverity, string> = {
  LOW: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  MEDIUM: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  HIGH: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  CRITICAL: 'bg-red-500/15 text-red-500 border-red-500/30',
};

const STATUS_STYLES: Record<AgenticStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  APPROVED: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  REJECTED: 'bg-red-500/15 text-red-500 border-red-500/30',
  CANCELLED: 'bg-muted text-muted-foreground border-border',
  EXPIRED: 'bg-muted text-muted-foreground border-border',
  EXECUTED: 'bg-primary/15 text-primary border-primary/30',
};

export const FounderAgentAuditPage: React.FC = () => {
  const [status, setStatus] = useState<AgenticStatus | 'all'>('all');
  const [severity, setSeverity] = useState<AgenticSeverity | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const filters: AgenticAuditFilters = useMemo(
    () => ({
      status: status === 'all' ? null : status,
      severity: severity === 'all' ? null : severity,
      search: search.trim() || null,
      page,
      pageSize,
    }),
    [status, severity, search, page],
  );

  const query = useQuery({
    queryKey: ['founder', 'agentic-audit', filters],
    queryFn: () => fetchAgenticAudit(filters),
    refetchInterval: 60000,
  });

  const rows = query.data?.rows ?? [];
  const summary = useMemo(() => summarizeAudit(rows), [rows]);
  const totalPages = Math.max(1, Math.ceil((query.data?.count ?? 0) / pageSize));

  const exportCsv = () => {
    if (!rows.length) return;
    const header = [
      'created_at', 'status', 'severity', 'decision_type',
      'confidence', 'risk_score', 'impact_score', 'workflow_id',
      'decision_id', 'recommendation',
    ];
    const csv = [
      header.join(','),
      ...rows.map((r) =>
        [
          r.created_at, r.status, r.severity, JSON.stringify(r.decision_type),
          r.confidence, r.risk_score, r.impact_score,
          r.workflow_id ?? '', r.decision_id ?? '',
          JSON.stringify(r.recommendation ?? ''),
        ].join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agentic-audit-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card className="border-gold/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Governança Agentic — Auditoria Persistente
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Atualizar
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <Metric label="Total" value={summary.total} />
          <Metric label="Pendentes" value={summary.pending} tone="amber" />
          <Metric label="Aprovadas" value={summary.approved} tone="emerald" />
          <Metric label="Rejeitadas" value={summary.rejected} tone="red" />
          <Metric label="Canceladas" value={summary.cancelled} />
          <Metric label="Expiradas" value={summary.expired} />
          <Metric label="Confiança média" value={`${summary.avgConfidence}%`} tone="primary" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bot className="h-4 w-4" /> Decisões registadas
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Input
              placeholder="Pesquisar (workflow, decisão, recomendação)…"
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              className="w-[280px]"
            />
            <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v as AgenticStatus | 'all'); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="APPROVED">Aprovada</SelectItem>
                <SelectItem value="REJECTED">Rejeitada</SelectItem>
                <SelectItem value="CANCELLED">Cancelada</SelectItem>
                <SelectItem value="EXPIRED">Expirada</SelectItem>
                <SelectItem value="EXECUTED">Executada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={(v) => { setPage(1); setSeverity(v as AgenticSeverity | 'all'); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Severidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas severidades</SelectItem>
                <SelectItem value="LOW">Baixa</SelectItem>
                <SelectItem value="MEDIUM">Média</SelectItem>
                <SelectItem value="HIGH">Alta</SelectItem>
                <SelectItem value="CRITICAL">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Data/Hora</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[110px]">Severidade</TableHead>
                    <TableHead>Decisão</TableHead>
                    <TableHead className="w-[80px] text-right">Conf.</TableHead>
                    <TableHead className="w-[80px] text-right">Risco</TableHead>
                    <TableHead className="w-[80px] text-right">Impacto</TableHead>
                    <TableHead className="w-[160px]">Workflow</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs tabular-nums">
                        {new Date(r.created_at).toLocaleString('pt-MZ')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_STYLES[r.status]}>{r.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={SEVERITY_STYLES[r.severity]}>{r.severity}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{r.decision_type}</div>
                        {r.recommendation && (
                          <div className="text-muted-foreground truncate max-w-[420px]">{r.recommendation}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{Number(r.confidence).toFixed(0)}%</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{Number(r.risk_score).toFixed(0)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{Number(r.impact_score).toFixed(0)}</TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground truncate max-w-[160px]">
                        {r.workflow_id ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!rows.length && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                        Nenhuma decisão registada ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Página {page} de {totalPages} · {query.data?.count ?? 0} registos</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Anterior
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number | string; tone?: 'emerald' | 'amber' | 'red' | 'primary' }> = ({
  label, value, tone,
}) => {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-500'
    : tone === 'amber' ? 'text-amber-500'
    : tone === 'red' ? 'text-red-500'
    : tone === 'primary' ? 'text-primary'
    : 'text-foreground';
  return (
    <div className="rounded-lg border bg-card/50 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-black tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
};

export default FounderAgentAuditPage;
