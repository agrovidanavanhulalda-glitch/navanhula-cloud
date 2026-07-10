import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreVertical, CreditCard, Crown, Timer } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  trial: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  expired: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

export const FounderSubscriptionsPage: React.FC = () => {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>('all');

  const listQuery = useQuery({
    queryKey: ['founder', 'subscriptions', status],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('founder_list_subscriptions', {
        _status: status === 'all' ? null : status,
        _limit: 200,
        _offset: 0,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const grantLifetime = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase.rpc('founder_grant_lifetime', { _company_id: companyId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Licença vitalícia concedida'); qc.invalidateQueries({ queryKey: ['founder', 'subscriptions'] }); },
    onError: (e: any) => toast.error(e.message ?? 'Falhou'),
  });

  const extendTrial = useMutation({
    mutationFn: async ({ companyId, days }: { companyId: string; days: number }) => {
      const { error } = await supabase.rpc('founder_extend_trial', { _company_id: companyId, _days: days });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Trial estendido'); qc.invalidateQueries({ queryKey: ['founder', 'subscriptions'] }); },
    onError: (e: any) => toast.error(e.message ?? 'Falhou'),
  });

  const setSubStatus = useMutation({
    mutationFn: async ({ companyId, plan, newStatus }: { companyId: string; plan: string; newStatus: string }) => {
      const { error } = await supabase.rpc('founder_set_subscription', {
        _company_id: companyId, _plan: plan, _status: newStatus, _expires_at: null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Assinatura atualizada'); qc.invalidateQueries({ queryKey: ['founder', 'subscriptions'] }); },
    onError: (e: any) => toast.error(e.message ?? 'Falhou'),
  });

  const kpis = React.useMemo(() => {
    const list = listQuery.data ?? [];
    return {
      total: list.length,
      active: list.filter((s: any) => s.status === 'active').length,
      trial: list.filter((s: any) => s.status === 'trial').length,
      expired: list.filter((s: any) => s.status === 'expired').length,
      cancelled: list.filter((s: any) => s.status === 'cancelled').length,
    };
  }, [listQuery.data]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Total" value={kpis.total} />
        <KpiCard label="Ativas" value={kpis.active} tone="emerald" />
        <KpiCard label="Trial" value={kpis.trial} tone="blue" />
        <KpiCard label="Expiradas" value={kpis.expired} tone="amber" />
        <KpiCard label="Canceladas" value={kpis.cancelled} tone="destructive" />
      </div>

      <Card className="border-gold/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="w-4 h-4" /> Assinaturas
          </CardTitle>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="expired">Expiradas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listQuery.data?.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs font-mono">{s.company_id?.slice(0, 8)}…</TableCell>
                      <TableCell className="font-medium">{s.plan}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_STYLES[s.status] ?? ''}>{s.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {s.expires_at ? new Date(s.expires_at).toLocaleDateString('pt-MZ') : (
                          <span className="text-gold font-semibold flex items-center gap-1"><Crown className="w-3 h-3" /> LIFETIME</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => grantLifetime.mutate(s.company_id)}>
                              <Crown className="w-3.5 h-3.5 mr-2 text-gold" /> Licença vitalícia
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => extendTrial.mutate({ companyId: s.company_id, days: 7 })}>
                              <Timer className="w-3.5 h-3.5 mr-2" /> +7 dias trial
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => extendTrial.mutate({ companyId: s.company_id, days: 30 })}>
                              <Timer className="w-3.5 h-3.5 mr-2" /> +30 dias trial
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setSubStatus.mutate({ companyId: s.company_id, plan: s.plan, newStatus: 'active' })}>
                              Reativar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSubStatus.mutate({ companyId: s.company_id, plan: s.plan, newStatus: 'cancelled' })}>
                              Cancelar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!listQuery.data?.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                        Nenhuma assinatura encontrada.
                      </TableCell>
                    </TableRow>
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

const KpiCard: React.FC<{ label: string; value: number; tone?: 'emerald' | 'blue' | 'amber' | 'destructive' }> = ({ label, value, tone }) => {
  const toneClass = tone === 'emerald' ? 'text-emerald-500' : tone === 'blue' ? 'text-blue-500' : tone === 'amber' ? 'text-amber-500' : tone === 'destructive' ? 'text-destructive' : 'text-foreground';
  return (
    <Card className="p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
    </Card>
  );
};

export default FounderSubscriptionsPage;
