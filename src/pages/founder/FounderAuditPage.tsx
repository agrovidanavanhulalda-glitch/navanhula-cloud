import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollText, Download } from 'lucide-react';
import { toast } from 'sonner';

const SOURCE_STYLES: Record<string, string> = {
  founder: 'bg-gold/15 text-gold border-gold/30',
  audit: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  auth: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
};

export const FounderAuditPage: React.FC = () => {
  const [source, setSource] = useState<string>('all');

  const query = useQuery({
    queryKey: ['founder', 'audit', source],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('founder_audit_search', {
        _source: source === 'all' ? null : source,
        _from: null, _to: null, _actor: null,
        _limit: 300, _offset: 0,
      });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const exportCsv = () => {
    const rows = query.data ?? [];
    if (!rows.length) { toast.error('Nada a exportar'); return; }
    const header = ['source', 'created_at', 'actor_id', 'action', 'target', 'metadata'];
    const csv = [
      header.join(','),
      ...rows.map((r: any) => [
        r.source,
        r.created_at,
        r.actor_id ?? '',
        JSON.stringify(r.action ?? ''),
        JSON.stringify(r.target ?? ''),
        JSON.stringify(r.metadata ?? {}),
      ].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `founder-audit-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  };

  return (
    <Card className="border-gold/30">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="w-4 h-4" /> Auditoria Global ({query.data?.length ?? 0})
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as fontes</SelectItem>
              <SelectItem value="founder">Founder</SelectItem>
              <SelectItem value="audit">Dados</SelectItem>
              <SelectItem value="auth">Auth</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="rounded-lg border overflow-hidden max-h-[65vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Fonte</TableHead>
                  <TableHead className="w-[170px]">Data/Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Alvo</TableHead>
                  <TableHead className="w-[140px]">Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.map((r: any, i: number) => (
                  <TableRow key={`${r.source}-${r.id}-${i}`}>
                    <TableCell>
                      <Badge variant="outline" className={SOURCE_STYLES[r.source] ?? ''}>{r.source}</Badge>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {new Date(r.created_at).toLocaleString('pt-MZ')}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{r.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[280px]">{r.target}</TableCell>
                    <TableCell className="text-[10px] font-mono text-muted-foreground">{r.actor_id?.slice(0, 8) ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {!query.data?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FounderAuditPage;
