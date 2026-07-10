import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Search, MoreVertical, Building2, TrendingUp, ShoppingCart, Package, Store, Users } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  suspended: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  deleted: 'bg-destructive/15 text-destructive border-destructive/30',
};

export const FounderCompaniesPage: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['founder', 'companies', { search, status }],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('founder_list_companies', {
        _search: search || null,
        _status: status === 'all' ? null : status,
        _limit: 100,
        _offset: 0,
      });
      if (error) throw error;
      return data ?? [];
    },
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: ['founder', 'company-stats', selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('founder_company_stats', { _company_id: selectedId });
      if (error) throw error;
      return data as any;
    },
  });

  const setStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase.rpc('founder_set_company_status', {
        _company_id: id,
        _status: newStatus,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Estado atualizado');
      qc.invalidateQueries({ queryKey: ['founder', 'companies'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Falhou'),
  });

  const formatMZN = (n: number) => new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(n ?? 0);

  return (
    <div className="space-y-4">
      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-4 h-4" /> Empresas ({listQuery.data?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="suspended">Suspensas</SelectItem>
                <SelectItem value="deleted">Excluídas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {listQuery.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Utilizadores</TableHead>
                    <TableHead className="text-right">Lojas</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listQuery.data?.map((c: any) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedId(c.id)}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-xs">{c.subscription_plan ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[c.status] ?? ''}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.users_count}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.stores_count}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedId(c.id)}>Ver estatísticas</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={c.status === 'active'}
                              onClick={() => setStatusMutation.mutate({ id: c.id, newStatus: 'active' })}
                            >Ativar</DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={c.status === 'suspended'}
                              onClick={() => setStatusMutation.mutate({ id: c.id, newStatus: 'suspended' })}
                            >Suspender</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>Excluir</DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir {c.name}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação marca a empresa como excluída (soft-delete) e será registrada na auditoria.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => setStatusMutation.mutate({ id: c.id, newStatus: 'deleted' })}>
                                    Confirmar exclusão
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!listQuery.data?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                        Nenhuma empresa encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{statsQuery.data?.company?.name ?? 'Empresa'}</SheetTitle>
          </SheetHeader>

          {statsQuery.isLoading ? (
            <div className="space-y-3 mt-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : statsQuery.data ? (
            <div className="grid grid-cols-2 gap-3 mt-6">
              <StatMini icon={TrendingUp} label="Receita" value={formatMZN(statsQuery.data.revenue_total)} />
              <StatMini icon={ShoppingCart} label="Vendas" value={statsQuery.data.sales_count} />
              <StatMini icon={Package} label="Produtos" value={statsQuery.data.products_count} />
              <StatMini icon={Store} label="Lojas" value={statsQuery.data.stores_count} />
              <StatMini icon={Users} label="Funcionários" value={statsQuery.data.employees_count} />
              <StatMini
                icon={Building2}
                label="Plano"
                value={statsQuery.data.subscription?.plan ?? 'Sem plano'}
              />
              <div className="col-span-2 rounded-lg border p-3 text-xs text-muted-foreground">
                <div>Estado: <strong>{statsQuery.data.subscription?.status ?? '—'}</strong></div>
                <div>Expira: <strong>{statsQuery.data.subscription?.expires_at ? new Date(statsQuery.data.subscription.expires_at).toLocaleDateString('pt-MZ') : '—'}</strong></div>
                <div>Último login: <strong>{statsQuery.data.last_login ? new Date(statsQuery.data.last_login).toLocaleString('pt-MZ') : '—'}</strong></div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const StatMini: React.FC<{ icon: React.ComponentType<any>; label: string; value: React.ReactNode }> = ({ icon: Icon, label, value }) => (
  <div className="rounded-lg border p-3">
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
      <Icon className="w-3 h-3" /> {label}
    </div>
    <div className="text-lg font-bold mt-1 truncate">{value}</div>
  </div>
);

export default FounderCompaniesPage;
