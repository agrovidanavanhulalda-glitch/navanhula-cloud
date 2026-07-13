import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { rpcWithMetrics } from '@/lib/telemetry/rpcWithMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, ScrollText, Search } from 'lucide-react';
import { toast } from 'sonner';

type LogRow = {
  id: string;
  source: string;
  created_at: string;
  actor_id?: string | null;
  action: string;
  target?: string | null;
  level?: string;
  metadata?: any;
};

const SOURCES = ['all', 'founder', 'audit', 'auth', 'system', 'api'] as const;

export const FounderLogsPage: React.FC = () => {
  const [source, setSource] = useState<string>('all');
  const [level, setLevel] = useState<string>('all');
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['founder', 'logs', source],
    queryFn: async () => {
      const [audit, sysErr, apiLogs] = await Promise.all([
        (supabase.rpc as any)('founder_audit_search', {
          _source: source === 'all' || ['system', 'api'].includes(source) ? null : source,
          _from: null, _to: null, _actor: null, _limit: 300, _offset: 0,
        }),
        supabase.from('system_errors' as any).select('id, created_at, message, severity, context').order('created_at', { ascending: false }).limit(200),
        supabase.from('api_request_logs' as any).select('id, created_at, endpoint, status_code, latency_ms').order('created_at', { ascending: false }).limit(200),
      ]);
      const rows: LogRow[] = [];
      if (!audit.error && audit.data) {
        for (const r of audit.data as any[]) rows.push({
          id: `${r.source}-${r.id}`, source: r.source, created_at: r.created_at,
          actor_id: r.actor_id, action: r.action, target: r.target, level: 'info', metadata: r.metadata,
        });
      }
      if (!sysErr.error && sysErr.data) {
        for (const r of sysErr.data as any[]) rows.push({
          id: `system-${r.id}`, source: 'system', created_at: r.created_at,
          action: r.message, target: JSON.stringify(r.context ?? {}), level: r.severity ?? 'error',
        });
      }
      if (!apiLogs.error && apiLogs.data) {
        for (const r of apiLogs.data as any[]) rows.push({
          id: `api-${r.id}`, source: 'api', created_at: r.created_at,
          action: `${r.status_code} ${r.endpoint}`, target: `${r.latency_ms} ms`,
          level: r.status_code >= 500 ? 'error' : r.status_code >= 400 ? 'warning' : 'info',
        });
      }
      rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return rows;
    },
    refetchInterval: 30_000,
  });

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return (query.data ?? []).filter((r) => {
      if (source !== 'all' && r.source !== source) return false;
      if (level !== 'all' && (r.level ?? 'info') !== level) return false;
      if (!term) return true;
      return [r.action, r.target, r.actor_id].some((v) => (v ?? '').toString().toLowerCase().includes(term));
    });
  }, [query.data, source, level, search]);

  const exportCsv = () => {
    if (!filtered.length) { toast.error('Nada a exportar'); return; }
    const header = ['source', 'level', 'created_at', 'actor_id', 'action', 'target'];
    const csv = [
      header.join(','),
      ...filtered.map((r) => [r.source, r.level ?? '', r.created_at, r.actor_id ?? '', JSON.stringify(r.action), JSON.stringify(r.target ?? '')].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `founder-logs-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  };

  const levelStyle = (l?: string) =>
    l === 'error' || l === 'critical' ? 'bg-destructive/15 text-destructive border-destructive/30'
    : l === 'warning' ? 'bg-warning/15 text-warning border-warning/30'
    : 'bg-muted text-muted-foreground';

  return (
    <Card className="border-gold/30">
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="h-4 w-4" /> Log Center ({filtered.length})
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar…" className="pl-8 w-[220px] h-9" />
          </div>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-3.5 w-3.5 mr-1.5" /> CSV</Button>
        </div>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
        ) : (
          <div className="rounded-lg border overflow-hidden max-h-[65vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[90px]">Fonte</TableHead>
                  <TableHead className="w-[80px]">Nível</TableHead>
                  <TableHead className="w-[160px]">Data/Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Alvo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.source}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={levelStyle(r.level)}>{r.level ?? 'info'}</Badge></TableCell>
                    <TableCell className="text-xs tabular-nums">{new Date(r.created_at).toLocaleString('pt-MZ')}</TableCell>
                    <TableCell className="text-xs font-medium truncate max-w-[320px]">{r.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[280px]">{r.target}</TableCell>
                  </TableRow>
                ))}
                {!filtered.length && (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Sem registros.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FounderLogsPage;
