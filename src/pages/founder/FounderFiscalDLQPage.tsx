import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, XCircle, Archive, Search, Eye } from 'lucide-react';

export const FounderFiscalDLQPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'FAILED' | 'CANCELLED' | 'ARCHIVED' | 'RETRY'>('FAILED');
  const [selected, setSelected] = useState<any>(null);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['founder_fiscal_dlq', status, search],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('founder_fiscal_dlq', {
        p_limit: 100, p_offset: 0, p_search: search || null, p_status: status,
      });
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 15_000,
  });

  const act = async (fn: string, args: any, label: string) => {
    const { data, error } = await (supabase.rpc as any)(fn, args);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    if (!(data as any)?.success) return toast({ title: 'Falha', description: JSON.stringify(data), variant: 'destructive' });
    toast({ title: label });
    qc.invalidateQueries({ queryKey: ['founder_fiscal_dlq'] });
    qc.invalidateQueries({ queryKey: ['founder_fiscal_metrics'] });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black">Dead Letter Center — Fiscal</h2>
        <p className="text-xs text-muted-foreground">Gestão de jobs fiscais falhados. Todas as ações são auditadas.</p>
      </div>

      <Card className="p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Pesquisar por ID, payload ou erro..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={status} onValueChange={(v: any) => setStatus(v)}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="FAILED">FAILED (DLQ)</SelectItem>
            <SelectItem value="RETRY">RETRY</SelectItem>
            <SelectItem value="CANCELLED">CANCELLED</SelectItem>
            <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline">Total: {data?.total ?? 0}</Badge>
      </Card>

      {isLoading ? <Skeleton className="h-64" /> : error ? (
        <Card className="p-6 border-destructive/40 text-destructive text-sm">{(error as Error).message}</Card>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground bg-secondary/30">
              <tr>
                <th className="text-left p-3">Job ID</th>
                <th className="text-left">Tentativas</th>
                <th className="text-left">Último erro</th>
                <th className="text-left">Criado</th>
                <th className="text-right p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).map((t: any) => (
                <tr key={t.id} className="border-t border-border/40 hover:bg-secondary/20">
                  <td className="p-3 font-mono">{String(t.id).slice(0, 8)}</td>
                  <td>{t.attempts}/{t.max_attempts}</td>
                  <td className="max-w-md truncate text-destructive">{t.last_error ?? '—'}</td>
                  <td>{new Date(t.created_at).toLocaleString('pt-PT')}</td>
                  <td className="text-right p-3 space-x-1">
                    <Button size="icon" variant="ghost" title="Detalhes" onClick={() => setSelected(t)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" title="Reprocessar" onClick={() => act('founder_fiscal_reprocess', { p_task_id: t.id }, 'Job reenviado')}><RefreshCw className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" title="Cancelar" onClick={() => act('founder_fiscal_cancel', { p_task_id: t.id, p_reason: 'cancelled from DLQ UI' }, 'Job cancelado')}><XCircle className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" title="Arquivar" onClick={() => act('founder_fiscal_archive', { p_task_id: t.id }, 'Job arquivado')}><Archive className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {(data?.rows ?? []).length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Sem jobs neste estado.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Detalhes do Job {selected && String(selected.id).slice(0, 8)}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-xs">
              <div><strong>Status:</strong> {selected.status}</div>
              <div><strong>Tentativas:</strong> {selected.attempts}/{selected.max_attempts}</div>
              <div><strong>Erro:</strong> <pre className="mt-1 p-2 bg-destructive/10 rounded text-destructive whitespace-pre-wrap">{selected.last_error ?? '—'}</pre></div>
              <div><strong>Payload:</strong> <pre className="mt-1 p-2 bg-secondary rounded whitespace-pre-wrap max-h-64 overflow-auto">{JSON.stringify(selected.payload, null, 2)}</pre></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FounderFiscalDLQPage;
