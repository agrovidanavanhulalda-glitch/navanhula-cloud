import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, Bell } from 'lucide-react';
import { toast } from 'sonner';

const severityStyle = (s: string) =>
  s === 'critical' ? 'bg-destructive/15 text-destructive border-destructive/30'
  : s === 'high' ? 'bg-orange-500/15 text-orange-500 border-orange-500/30'
  : s === 'warning' ? 'bg-warning/15 text-warning border-warning/30'
  : 'bg-blue-500/15 text-blue-500 border-blue-500/30';

export const FounderAlertsPage: React.FC = () => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['founder', 'system-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('system_alerts' as any)
        .select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    refetchInterval: 30_000,
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('system_alerts' as any)
        .update({ resolved: true, resolved_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Alerta resolvido'); qc.invalidateQueries({ queryKey: ['founder', 'system-alerts'] }); },
    onError: (e: any) => toast.error(e.message ?? 'Falha'),
  });

  const rows = query.data ?? [];
  const active = rows.filter((r) => !r.resolved);
  const critical = active.filter((r) => r.severity === 'critical').length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Alertas Ativos</p><p className="text-2xl font-black">{active.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Críticos</p><p className="text-2xl font-black text-destructive">{critical}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Resolvidos (total)</p><p className="text-2xl font-black text-success">{rows.length - active.length}</p></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Alert Center</CardTitle></CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="rounded-lg border overflow-hidden max-h-[65vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[100px]">Severidade</TableHead>
                    <TableHead className="w-[160px]">Data</TableHead>
                    <TableHead>Título / Mensagem</TableHead>
                    <TableHead className="w-[100px]">Estado</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell><Badge variant="outline" className={severityStyle(r.severity ?? 'info')}>{r.severity ?? 'info'}</Badge></TableCell>
                      <TableCell className="text-xs tabular-nums">{new Date(r.created_at).toLocaleString('pt-MZ')}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold">{r.title ?? r.alert_type ?? '—'}</div>
                        <div className="text-muted-foreground">{r.message}</div>
                      </TableCell>
                      <TableCell>
                        {r.resolved
                          ? <Badge variant="outline" className="bg-success/15 text-success border-success/30"><CheckCircle2 className="h-3 w-3 mr-1" />Resolvido</Badge>
                          : <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30"><AlertTriangle className="h-3 w-3 mr-1" />Ativo</Badge>}
                      </TableCell>
                      <TableCell>
                        {!r.resolved && (
                          <Button size="sm" variant="outline" onClick={() => resolve.mutate(r.id)} disabled={resolve.isPending}>Resolver</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!rows.length && (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Nenhum alerta.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FounderAlertsPage;
