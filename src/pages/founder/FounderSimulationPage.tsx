import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSimulation } from '@/contexts/SimulationContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Play, StopCircle, UserCog, Clock, History } from 'lucide-react';
import { format } from 'date-fns';

const ROLES = ['owner', 'admin', 'ceo', 'director', 'manager', 'hr', 'cashier', 'seller', 'viewer'];

export const FounderSimulationPage: React.FC = () => {
  const { session, isActive, startSimulation, endSimulation, loading } = useSimulation();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ id: string; name: string; email: string; company_id: string | null } | null>(null);
  const [role, setRole] = useState<string>('viewer');
  const [reason, setReason] = useState('');
  const [expiresMinutes, setExpiresMinutes] = useState<number>(60);

  const usersQuery = useQuery({
    queryKey: ['founder', 'sim-users', search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('founder_list_users', {
        _search: search || null, _company_id: null, _role: null, _blocked: false,
        _limit: 50, _offset: 0,
      });
      if (error) throw error;
      return data ?? [];
    },
    placeholderData: keepPreviousData,
  });

  const historyQuery = useQuery({
    queryKey: ['founder', 'sim-history'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('founder_impersonate_history' as any, { p_limit: 30 });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const handleStart = async () => {
    if (!selected) return;
    await startSimulation({
      target_user_id: selected.id,
      company_id: selected.company_id,
      role,
      reason: reason || null,
      expires_minutes: expiresMinutes,
    });
    setSelected(null);
    setReason('');
  };

  return (
    <div className="space-y-6">
      <Card className={isActive ? 'border-amber-500/50 bg-amber-500/5' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" /> Sessão Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isActive && session ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 text-sm">
                <div><strong>Simulando:</strong> {session.target_name || session.target_email}</div>
                {session.company_name && <div><strong>Empresa:</strong> {session.company_name}</div>}
                {session.role && <div><strong>Perfil:</strong> {session.role}</div>}
                <div className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Iniciado {format(new Date(session.started_at), 'dd/MM/yyyy HH:mm:ss')}
                </div>
                {session.expires_at && (
                  <div className="text-muted-foreground">Expira {format(new Date(session.expires_at), 'HH:mm:ss')}</div>
                )}
              </div>
              <Button variant="destructive" onClick={() => endSimulation()} disabled={loading}>
                <StopCircle className="mr-2 h-4 w-4" /> Encerrar Simulação
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma simulação ativa. Selecione um utilizador abaixo.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Utilizadores Disponíveis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Pesquisar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          {usersQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(usersQuery.data as any[])?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>{u.company_name || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{u.account_type || 'user'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isActive || u.is_founder}
                          onClick={() => setSelected({ id: u.id, name: u.full_name, email: u.email, company_id: u.company_id })}
                        >
                          <Play className="mr-1 h-3 w-3" /> Simular
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-4 w-4" /> Histórico Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(historyQuery.data as any[])?.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.target_name || h.target_email || h.target_id}</TableCell>
                    <TableCell>{h.role || '—'}</TableCell>
                    <TableCell>{format(new Date(h.started_at), 'dd/MM HH:mm')}</TableCell>
                    <TableCell>{h.ended_at ? format(new Date(h.ended_at), 'dd/MM HH:mm') : <Badge>ativo</Badge>}</TableCell>
                    <TableCell>{h.duration_ms ? `${Math.round(h.duration_ms / 1000)}s` : '—'}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">{h.reason || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar Simulação</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="text-sm">
                <div><strong>Utilizador:</strong> {selected.name || selected.email}</div>
                <div className="text-muted-foreground">{selected.email}</div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Perfil a simular</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Expiração (minutos)</label>
                <Input type="number" min={1} max={480} value={expiresMinutes} onChange={(e) => setExpiresMinutes(Number(e.target.value) || 60)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Motivo (opcional)</label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Suporte ao cliente #1234" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button onClick={handleStart} disabled={loading}>
              <Play className="mr-2 h-4 w-4" /> Iniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FounderSimulationPage;
