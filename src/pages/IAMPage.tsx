import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Users, Plus, Shield, Link2, Copy, Check, Ban, UserCheck,
  Trash2, Settings2, Building2, Monitor, ScrollText, MapPin
} from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';

const ROLES = [
  { value: 'ceo', label: 'CEO' },
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gestor' },
  { value: 'seller', label: 'Vendedor' },
  { value: 'cashier', label: 'Caixa' },
];

const MODULES = ['stock', 'sales', 'finance', 'users', 'reports', 'settings', 'compliance', 'hr'];
const MODULE_LABELS: Record<string, string> = {
  stock: 'Estoque', sales: 'Vendas', finance: 'Financeiro', users: 'Utilizadores',
  reports: 'Relatórios', settings: 'Configurações', compliance: 'Compliance', hr: 'Recursos Humanos',
};

const ACTIONS = ['can_view', 'can_create', 'can_edit', 'can_delete', 'can_approve'];
const ACTION_LABELS: Record<string, string> = {
  can_view: 'Ver', can_create: 'Criar', can_edit: 'Editar', can_delete: 'Apagar', can_approve: 'Aprovar',
};

const roleLabels: Record<string, string> = {
  owner: 'Proprietário', admin: 'Administrador', manager: 'Gestor',
  seller: 'Vendedor', cashier: 'Caixa', accountant: 'Contabilista', ceo: 'CEO',
};

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  owner: 'destructive', ceo: 'destructive', admin: 'default',
  manager: 'secondary', seller: 'outline', cashier: 'outline', accountant: 'secondary',
};

const IAMPage = () => {
  const { company, user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id;
  const [showInvite, setShowInvite] = useState(false);
  const [showBranch, setShowBranch] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [inviteForm, setInviteForm] = useState({ role: 'seller', max_uses: '1', expires_days: '7', branch_id: '' });
  const [branchForm, setBranchForm] = useState({ name: '', address: '', phone: '', email: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', branch_id: '' });
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState<string>('all');

  // ── Queries ──
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['iam-members', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_users')
        .select('*, profiles:user_id(full_name, email)')
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['iam-branches', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('company_id', companyId!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ['iam-invitations', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_invitations')
        .select('*')
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['iam-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('role_permissions').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['iam-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('is_active', true)
        .order('last_seen_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['iam-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // ── Mutations ──
  const createInvite = useMutation({
    mutationFn: async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(inviteForm.expires_days));
      const { error } = await supabase.from('company_invitations').insert({
        company_id: companyId!,
        role: inviteForm.role,
        max_uses: parseInt(inviteForm.max_uses),
        expires_at: expiresAt.toISOString(),
        created_by: user?.id!,
        branch_id: inviteForm.branch_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam-invitations'] });
      toast.success('Convite criado!');
      setShowInvite(false);
    },
    onError: () => toast.error('Erro ao criar convite'),
  });

  const createBranch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('branches').insert({
        company_id: companyId!,
        name: branchForm.name,
        address: branchForm.address || null,
        phone: branchForm.phone || null,
        email: branchForm.email || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam-branches'] });
      toast.success('Filial criada!');
      setShowBranch(false);
      setBranchForm({ name: '', address: '', phone: '', email: '' });
    },
    onError: () => toast.error('Erro ao criar filial'),
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { data, error } = await supabase.rpc('update_company_user_role', {
        p_user_id: userId, p_company_id: companyId!, p_new_role: newRole,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.message || 'Erro');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam-members'] });
      toast.success('Cargo alterado!');
    },
    onError: (e: any) => toast.error(e.message || 'Erro'),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { data, error } = await supabase.rpc('toggle_company_user_status', {
        p_user_id: userId, p_company_id: companyId!, p_status: status,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.message || 'Erro');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam-members'] });
      toast.success('Status alterado!');
    },
    onError: (e: any) => toast.error(e.message || 'Erro'),
  });

  const terminateSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.rpc('terminate_user_session', { p_session_id: sessionId });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.message || 'Erro');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam-sessions'] });
      toast.success('Sessão encerrada!');
    },
    onError: (e: any) => toast.error(e.message || 'Erro'),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('company_invitations').update({ status: 'revoked' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam-invitations'] });
      toast.success('Convite revogado');
    },
  });

  const deleteBranch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('branches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam-branches'] });
      toast.success('Filial removida');
    },
    onError: () => toast.error('Erro ao remover filial'),
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Empresa não selecionada');
      
      const userId = crypto.randomUUID();
      
      // 1. Criar perfil na tabela profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: userForm.name,
          email: userForm.email,
          company_id: companyId,
          branch_id: userForm.branch_id || null,
          status: 'active'
        });
      
      if (profileError) throw profileError;

      // 2. Vincular utilizador à empresa
      const { error: companyUserError } = await supabase
        .from('company_users')
        .insert({
          user_id: userId,
          company_id: companyId,
          role: 'seller', // Vendedor por padrão conforme solicitado
          status: 'active',
          branch_id: userForm.branch_id || null
        });

      if (companyUserError) throw companyUserError;

      // 3. Adicionar cargo na tabela user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'seller'
        });

      if (roleError) {
        console.error('Erro ao atribuir cargo, mas utilizador foi criado:', roleError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam-members'] });
      toast.success('Utilizador criado com sucesso!');
      setShowCreateUser(false);
      setUserForm({ name: '', email: '', branch_id: '' });
    },
    onError: (error: any) => {
      console.error('Erro ao criar utilizador:', error);
      toast.error('Falha ao criar utilizador: ' + (error.message || 'Erro desconhecido'));
    }
  });

  const copyInviteLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/convite/${token}`);
    setCopiedToken(token);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getPermissionsForRole = (role: string) => permissions.filter((p: any) => p.role === role);
  const branchName = (id: string | null) => branches.find((b: any) => b.id === id)?.name || '-';

  return (
    <PermissionGate module="users">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-7 h-7 text-primary" /> IAM — Identidade & Acesso
            </h1>
            <p className="text-sm text-muted-foreground">Utilizadores, filiais, permissões, sessões e auditoria</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
              <DialogTrigger asChild>
                <Button variant="default" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4" /> Criar Utilizador
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Criar Novo Utilizador (Vendedor)</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-4">
                  <div>
                    <Label htmlFor="user-name">Nome Completo *</Label>
                    <Input id="user-name" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: João Silva" />
                  </div>
                  <div>
                    <Label htmlFor="user-email">Email *</Label>
                    <Input id="user-email" type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="joao@exemplo.com" />
                  </div>
                  {branches.length > 0 && (
                    <div>
                      <Label htmlFor="user-branch">Filial (opcional)</Label>
                      <Select value={userForm.branch_id} onValueChange={v => setUserForm(f => ({ ...f, branch_id: v }))}>
                        <SelectTrigger id="user-branch"><SelectValue placeholder="Selecione uma filial" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem filial</SelectItem>
                          {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Nota: O utilizador será criado com o cargo de <strong>Vendedor</strong>.
                  </p>
                </div>
                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setShowCreateUser(false)}>Cancelar</Button>
                  <Button 
                    onClick={() => createUserMutation.mutate()} 
                    disabled={!userForm.name || !userForm.email || createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? 'Criando...' : 'Criar Utilizador'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={showBranch} onOpenChange={setShowBranch}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><Building2 className="w-4 h-4" /> Nova Filial</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Criar Filial</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome *</Label><Input value={branchForm.name} onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><Label>Endereço</Label><Input value={branchForm.address} onChange={e => setBranchForm(f => ({ ...f, address: e.target.value }))} /></div>
                  <div><Label>Telefone</Label><Input value={branchForm.phone} onChange={e => setBranchForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div><Label>Email</Label><Input value={branchForm.email} onChange={e => setBranchForm(f => ({ ...f, email: e.target.value }))} /></div>
                </div>
                <DialogFooter>
                  <Button onClick={() => createBranch.mutate()} disabled={!branchForm.name || createBranch.isPending}>
                    {createBranch.isPending ? 'Criando...' : 'Criar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={showInvite} onOpenChange={setShowInvite}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Link2 className="w-4 h-4" /> Gerar Convite</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Gerar Link de Convite</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Cargo</Label>
                    <Select value={inviteForm.role} onValueChange={v => setInviteForm(f => ({ ...f, role: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {branches.length > 0 && (
                    <div>
                      <Label>Filial (opcional)</Label>
                      <Select value={inviteForm.branch_id} onValueChange={v => setInviteForm(f => ({ ...f, branch_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Sem filial" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sem filial</SelectItem>
                          {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div><Label>Máximo de usos</Label><Input type="number" min="1" max="100" value={inviteForm.max_uses} onChange={e => setInviteForm(f => ({ ...f, max_uses: e.target.value }))} /></div>
                  <div><Label>Expira em (dias)</Label><Input type="number" min="1" max="30" value={inviteForm.expires_days} onChange={e => setInviteForm(f => ({ ...f, expires_days: e.target.value }))} /></div>
                </div>
                <DialogFooter>
                  <Button onClick={() => createInvite.mutate()} disabled={createInvite.isPending}>
                    {createInvite.isPending ? 'Criando...' : 'Criar Link'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { icon: Users, label: 'Membros', value: members.length, color: 'text-primary' },
            { icon: Building2, label: 'Filiais', value: branches.length, color: 'text-blue-500' },
            { icon: Shield, label: 'Admins', value: members.filter((m: any) => ['admin', 'ceo'].includes(m.role)).length, color: 'text-primary' },
            { icon: UserCheck, label: 'Ativos', value: members.filter((m: any) => m.status === 'active').length, color: 'text-emerald-500' },
            { icon: Monitor, label: 'Sessões', value: sessions.length, color: 'text-amber-500' },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label}><CardContent className="pt-6 flex items-center gap-3">
              <Icon className={`w-7 h-7 ${color}`} />
              <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="members">
          <TabsList className="flex-wrap">
            <TabsTrigger value="members"><Users className="w-4 h-4 mr-1" />Membros</TabsTrigger>
            <TabsTrigger value="branches"><Building2 className="w-4 h-4 mr-1" />Filiais</TabsTrigger>
            <TabsTrigger value="invites"><Link2 className="w-4 h-4 mr-1" />Convites</TabsTrigger>
            <TabsTrigger value="permissions"><Settings2 className="w-4 h-4 mr-1" />Permissões</TabsTrigger>
            <TabsTrigger value="sessions"><Monitor className="w-4 h-4 mr-1" />Sessões</TabsTrigger>
            <TabsTrigger value="audit"><ScrollText className="w-4 h-4 mr-1" />Auditoria</TabsTrigger>
          </TabsList>

          {/* ── Members ── */}
          <TabsContent value="members">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Filial</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Desde</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
                  ) : members.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum membro</TableCell></TableRow>
                  ) : members.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.profiles?.full_name || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.profiles?.email || '-'}</TableCell>
                      <TableCell>
                        <Select defaultValue={m.role} onValueChange={v => changeRole.mutate({ userId: m.user_id, newRole: v })}>
                          <SelectTrigger className="w-[130px] h-8">
                            <Badge variant={roleBadgeVariant[m.role] || 'outline'}>{roleLabels[m.role] || m.role}</Badge>
                          </SelectTrigger>
                          <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm">{branchName(m.branch_id)}</TableCell>
                      <TableCell>
                        <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>
                          {m.status === 'active' ? 'Ativo' : 'Bloqueado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(m.created_at).toLocaleDateString('pt-MZ')}</TableCell>
                      <TableCell className="text-right">
                        {m.user_id !== user?.id && (
                          <Button variant="ghost" size="sm" onClick={() => toggleStatus.mutate({ userId: m.user_id, status: m.status === 'active' ? 'blocked' : 'active' })}>
                            {m.status === 'active' ? <Ban className="w-4 h-4 text-destructive" /> : <UserCheck className="w-4 h-4 text-emerald-500" />}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          {/* ── Branches ── */}
          <TabsContent value="branches">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma filial criada</TableCell></TableRow>
                  ) : branches.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />{b.name}</TableCell>
                      <TableCell className="text-sm">{b.address || '-'}</TableCell>
                      <TableCell className="text-sm">{b.phone || '-'}</TableCell>
                      <TableCell className="text-sm">{b.email || '-'}</TableCell>
                      <TableCell><Badge variant={b.is_active ? 'default' : 'secondary'}>{b.is_active ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => deleteBranch.mutate(b.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          {/* ── Invites ── */}
          <TabsContent value="invites">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Link</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Filial</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum convite</TableCell></TableRow>
                  ) : invitations.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs max-w-[180px] truncate">{`/convite/${inv.token}`}</TableCell>
                      <TableCell><Badge variant="outline">{roleLabels[inv.role] || inv.role}</Badge></TableCell>
                      <TableCell className="text-sm">{branchName(inv.branch_id)}</TableCell>
                      <TableCell>{inv.used_count}/{inv.max_uses}</TableCell>
                      <TableCell className="text-sm">{new Date(inv.expires_at).toLocaleDateString('pt-MZ')}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === 'active' ? 'default' : 'secondary'}>
                          {inv.status === 'active' ? 'Ativo' : inv.status === 'revoked' ? 'Revogado' : 'Expirado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => copyInviteLink(inv.token)}>
                          {copiedToken === inv.token ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        {inv.status === 'active' && (
                          <Button variant="ghost" size="sm" onClick={() => revokeInvite.mutate(inv.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          {/* ── Permissions ── */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5" /> Matriz RBAC — Permissões por Cargo</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Módulo</TableHead>
                      {ROLES.map(r => (
                        <TableHead key={r.value} className="text-center" colSpan={ACTIONS.length}>
                          <Badge variant={roleBadgeVariant[r.value] || 'outline'}>{r.label}</Badge>
                        </TableHead>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableHead />
                      {ROLES.map(r => (
                        <React.Fragment key={r.value}>
                          {ACTIONS.map(a => (
                            <TableHead key={a} className="text-xs text-center px-1">{ACTION_LABELS[a]}</TableHead>
                          ))}
                        </React.Fragment>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MODULES.map(mod => (
                      <TableRow key={mod}>
                        <TableCell className="font-medium">{MODULE_LABELS[mod]}</TableCell>
                        {ROLES.map(r => {
                          const perm = getPermissionsForRole(r.value).find((p: any) => p.module === mod);
                          return (
                            <React.Fragment key={r.value}>
                              {ACTIONS.map(action => (
                                <TableCell key={action} className="text-center px-1">
                                  <Checkbox checked={perm?.[action] ?? false} disabled className="mx-auto" />
                                </TableCell>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-4">CEO e Admin têm acesso total automático. A coluna "Aprovar" controla ações de aprovação em workflows.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Sessions ── */}
          <TabsContent value="sessions">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Monitor className="w-5 h-5" /> Sessões Ativas</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilizador</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Dispositivo</TableHead>
                      <TableHead>Último Acesso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma sessão ativa</TableCell></TableRow>
                    ) : sessions.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.user_id?.slice(0, 8)}...</TableCell>
                        <TableCell className="text-sm">{s.ip_address || '-'}</TableCell>
                        <TableCell className="text-sm">{s.device_type || s.user_agent?.slice(0, 30) || '-'}</TableCell>
                        <TableCell className="text-sm">{new Date(s.last_seen_at).toLocaleString('pt-MZ')}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => terminateSession.mutate(s.id)}>
                            <Ban className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="flex items-center gap-2"><ScrollText className="w-5 h-5" /> Logs de Auditoria</CardTitle>
                  <Select value={auditFilter} onValueChange={setAuditFilter}>
                    <SelectTrigger className="w-[160px] h-8">
                      <SelectValue placeholder="Filtrar ação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Ações</SelectItem>
                      <SelectItem value="INSERT">Criação</SelectItem>
                      <SelectItem value="UPDATE">Edição</SelectItem>
                      <SelectItem value="DELETE">Remoção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Tabela</TableHead>
                      <TableHead>Registo</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const filtered = auditFilter === 'all' ? auditLogs : auditLogs.filter((l: any) => l.action === auditFilter);
                      return filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sem registos</TableCell></TableRow>
                      ) : filtered.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">{new Date(log.created_at).toLocaleString('pt-MZ')}</TableCell>
                          <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                          <TableCell className="text-sm">{log.table_name || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{log.record_id?.slice(0, 8) || '-'}</TableCell>
                          <TableCell className="text-sm">{log.ip_address || '-'}</TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGate>
  );
};

export default IAMPage;
