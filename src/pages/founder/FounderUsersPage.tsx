import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, MoreVertical, Users, Crown, ShieldOff, ShieldCheck, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export const FounderUsersPage: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [blockedFilter, setBlockedFilter] = useState<string>('all');

  const listQuery = useQuery({
    queryKey: ['founder', 'users', { search, blockedFilter }],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('founder_list_users', {
        _search: search || null,
        _company_id: null,
        _role: null,
        _blocked: blockedFilter === 'all' ? null : blockedFilter === 'blocked',
        _limit: 100,
        _offset: 0,
      });
      if (error) throw error;
      return data ?? [];
    },
    placeholderData: keepPreviousData,
  });

  const setBlocked = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }) => {
      const { error } = await supabase.rpc('founder_set_user_blocked', { _user_id: id, _blocked: blocked });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Utilizador atualizado'); qc.invalidateQueries({ queryKey: ['founder', 'users'] }); },
    onError: (e: any) => toast.error(e.message ?? 'Falhou'),
  });

  const forceLogout = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('founder_force_logout', { _user_id: id });
      if (error) throw error;
    },
    onSuccess: () => toast.success('Logout forçado. O utilizador será desconectado.'),
    onError: (e: any) => toast.error(e.message ?? 'Falhou'),
  });

  const toggleFounder = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.rpc('founder_toggle_founder', { _user_id: id, _enabled: enabled });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Founder atualizado'); qc.invalidateQueries({ queryKey: ['founder', 'users'] }); },
    onError: (e: any) => toast.error(e.message ?? 'Falhou'),
  });

  return (
    <Card className="border-gold/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4" /> Utilizadores ({listQuery.data?.length ?? 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Pesquisar por email ou nome…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={blockedFilter} onValueChange={setBlockedFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="blocked">Bloqueados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {listQuery.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / Email</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.data?.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {u.is_founder && <Crown className="w-3.5 h-3.5 text-gold" />}
                        <div>
                          <div className="font-medium text-sm">{u.full_name ?? '—'}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{u.company_name ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(u.roles ?? []).map((r: string) => (
                          <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.blocked_at ? (
                        <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">Bloqueado</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {u.blocked_at ? (
                            <DropdownMenuItem onClick={() => setBlocked.mutate({ id: u.id, blocked: false })}>
                              <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Desbloquear
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setBlocked.mutate({ id: u.id, blocked: true })}>
                              <ShieldOff className="w-3.5 h-3.5 mr-2" /> Bloquear
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => forceLogout.mutate(u.id)}>
                            <LogOut className="w-3.5 h-3.5 mr-2" /> Forçar logout
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Crown className="w-3.5 h-3.5 mr-2 text-gold" />
                                {u.is_founder ? 'Remover Founder' : 'Tornar Founder'}
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{u.is_founder ? 'Remover Founder?' : 'Tornar Founder?'}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {u.is_founder
                                    ? 'Este utilizador perderá acesso total à plataforma.'
                                    : 'Este utilizador ganhará acesso absoluto a toda a plataforma NAVANHULA CLOUD.'}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => toggleFounder.mutate({ id: u.id, enabled: !u.is_founder })}>
                                  Confirmar
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
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                      Nenhum utilizador encontrado.
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

export default FounderUsersPage;
