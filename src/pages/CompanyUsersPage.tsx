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
import { Users, Plus, Shield, Link2, Copy, Check, Ban, UserCheck, Trash2, Settings2, UserPlus, Eye, EyeOff } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';

const ROLES = [
  { value: 'ceo', label: 'CEO (Acesso Total)' },
  { value: 'admin', label: 'Administrador (Empresa)' },
  { value: 'manager', label: 'Gestor (Relatórios)' },
  { value: 'seller', label: 'Vendedor (PDV)' },
];

const MODULES = ['stock', 'sales', 'finance', 'users', 'reports', 'settings', 'compliance', 'hr'];
const MODULE_LABELS: Record<string, string> = {
  stock: 'Estoque', sales: 'Vendas', finance: 'Financeiro', users: 'Utilizadores',
  reports: 'Relatórios', settings: 'Configurações', compliance: 'Compliance', hr: 'Recursos Humanos',
};

const CompanyUsersPage = () => {
  const { company, user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id;
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showPermissions, setShowPermissions] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({ role: 'seller', max_uses: '1', expires_days: '7' });
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [createUserForm, setCreateUserForm] = useState({ full_name: '', email: '', role: 'seller' });
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; role: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Fetch members
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['company-users', companyId],
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

  // Fetch invitations
  const { data: invitations = [] } = useQuery({
    queryKey: ['company-invitations', companyId],
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

  // Fetch permissions for editing
  const { data: permissions = [] } = useQuery({
    queryKey: ['role-permissions-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  // Create invitation
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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-invitations'] });
      toast.success('Link de convite criado!');
      setShowInvite(false);
    },
    onError: () => toast.error('Erro ao criar convite'),
  });

  // Change role
  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { data, error } = await supabase.rpc('update_company_user_role', {
        p_user_id: userId,
        p_company_id: companyId!,
        p_new_role: newRole,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.message || 'Erro');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      toast.success('Cargo alterado!');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao alterar cargo'),
  });

  // Toggle status
  const toggleStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { data, error } = await supabase.rpc('toggle_company_user_status', {
        p_user_id: userId,
        p_company_id: companyId!,
        p_status: status,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.message || 'Erro');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      toast.success('Status alterado!');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao alterar status'),
  });

  // Revoke invitation
  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('company_invitations')
        .update({ status: 'revoked' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-invitations'] });
      toast.success('Convite revogado');
    },
  });

  // Create user via edge function
  const createUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('seed-users', {
        body: {
          users: [{
            email: createUserForm.email,
            full_name: createUserForm.full_name,
            role: createUserForm.role,
          }],
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao criar utilizador');
      return data.users[0];
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      setCreatedCredentials({ email: result.email, password: result.password, role: result.role });
      setCreateUserForm({ full_name: '', email: '', role: 'seller' });
      toast.success('Utilizador criado com sucesso!');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar utilizador'),
  });

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/convite/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const roleLabels: Record<string, string> = {
    owner: 'Proprietário', admin: 'Administrador', manager: 'Gestor',
    seller: 'Vendedor', cashier: 'Caixa', accountant: 'Contabilista', ceo: 'CEO',
  };

  const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    owner: 'destructive', ceo: 'destructive', admin: 'default',
    manager: 'secondary', seller: 'outline', cashier: 'outline', accountant: 'secondary',
  };

  const getPermissionsForRole = (role: string) => {
    return permissions.filter((p: any) => p.role === role);
  };

  return (
    <PermissionGate module="users">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Equipa</h1>
            <p className="text-sm text-muted-foreground">Utilizadores, permissões e convites</p>
          </div>
          <div className="flex gap-2">
            {/* Create User Dialog */}
            <Dialog open={showCreateUser} onOpenChange={(open) => {
              setShowCreateUser(open);
              if (!open) { setCreatedCredentials(null); setShowPassword(false); }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><UserPlus className="w-4 h-4" /> Criar Utilizador</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{createdCredentials ? 'Credenciais Criadas' : 'Criar Novo Utilizador'}</DialogTitle></DialogHeader>
                {createdCredentials ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p className="font-mono text-sm">{createdCredentials.email}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Senha</Label>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm">{showPassword ? createdCredentials.password : '••••••••••'}</p>
                          <Button variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Cargo</Label>
                        <p className="text-sm">{roleLabels[createdCredentials.role] || createdCredentials.role}</p>
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => {
                      navigator.clipboard.writeText(`Email: ${createdCredentials.email}\nSenha: ${createdCredentials.password}`);
                      toast.success('Credenciais copiadas!');
                    }}>
                      <Copy className="w-4 h-4 mr-2" /> Copiar Credenciais
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label>Nome Completo</Label>
                      <Input value={createUserForm.full_name} onChange={e => setCreateUserForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Ex: João Silva" />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={createUserForm.email} onChange={e => setCreateUserForm(f => ({ ...f, email: e.target.value }))} placeholder="joao@empresa.com" />
                    </div>
                    <div>
                      <Label>Cargo</Label>
                      <Select value={createUserForm.role} onValueChange={v => setCreateUserForm(f => ({ ...f, role: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {!createdCredentials && (
                  <DialogFooter>
                    <Button onClick={() => createUser.mutate()} disabled={createUser.isPending || !createUserForm.email || !createUserForm.full_name}>
                      {createUser.isPending ? 'Criando...' : 'Criar Utilizador'}
                    </Button>
                  </DialogFooter>
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={showInvite} onOpenChange={setShowInvite}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><Link2 className="w-4 h-4" /> Gerar Convite</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Gerar Link de Convite</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Cargo</Label>
                    <Select value={inviteForm.role} onValueChange={v => setInviteForm(f => ({ ...f, role: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Máximo de usos</Label>
                    <Input type="number" min="1" max="100" value={inviteForm.max_uses}
                      onChange={e => setInviteForm(f => ({ ...f, max_uses: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Expira em (dias)</Label>
                    <Input type="number" min="1" max="30" value={inviteForm.expires_days}
                      onChange={e => setInviteForm(f => ({ ...f, expires_days: e.target.value }))} />
                  </div>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div><p className="text-xs text-muted-foreground">Total Membros</p><p className="text-2xl font-bold">{members.length}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div><p className="text-xs text-muted-foreground">Admins</p><p className="text-2xl font-bold">{members.filter((m: any) => ['admin', 'owner', 'ceo'].includes(m.role)).length}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-primary" />
            <div><p className="text-xs text-muted-foreground">Ativos</p><p className="text-2xl font-bold">{members.filter((m: any) => m.status === 'active').length}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3">
            <Link2 className="w-8 h-8 text-primary" />
            <div><p className="text-xs text-muted-foreground">Convites Ativos</p><p className="text-2xl font-bold">{invitations.filter((i: any) => i.status === 'active').length}</p></div>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Membros</TabsTrigger>
            <TabsTrigger value="invites">Convites</TabsTrigger>
            <TabsTrigger value="permissions">Permissões</TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
                    ) : members.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum membro</TableCell></TableRow>
                    ) : members.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.profiles?.full_name || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.profiles?.email || '-'}</TableCell>
                        <TableCell>
                          <Select defaultValue={m.role} onValueChange={v => changeRole.mutate({ userId: m.user_id, newRole: v })}>
                            <SelectTrigger className="w-[140px] h-8">
                              <Badge variant={roleBadgeVariant[m.role] || 'outline'}>{roleLabels[m.role] || m.role}</Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>
                            {m.status === 'active' ? 'Ativo' : 'Bloqueado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{new Date(m.created_at).toLocaleDateString('pt-MZ')}</TableCell>
                        <TableCell className="text-right">
                          {m.user_id !== user?.id && (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => toggleStatus.mutate({
                                userId: m.user_id,
                                status: m.status === 'active' ? 'blocked' : 'active'
                              })}
                            >
                              {m.status === 'active' ? <Ban className="w-4 h-4 text-destructive" /> : <UserCheck className="w-4 h-4 text-emerald-500" />}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invites Tab */}
          <TabsContent value="invites">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Link</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Usos</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum convite</TableCell></TableRow>
                    ) : invitations.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {`${window.location.origin}/convite/${inv.token}`}
                        </TableCell>
                        <TableCell><Badge variant="outline">{roleLabels[inv.role] || inv.role}</Badge></TableCell>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5" /> Matriz de Permissões por Cargo</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Módulo</TableHead>
                      {ROLES.map(r => (
                        <TableHead key={r.value} className="text-center" colSpan={4}>
                          <Badge variant={roleBadgeVariant[r.value] || 'outline'}>{r.label}</Badge>
                        </TableHead>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableHead />
                      {ROLES.map(r => (
                        <React.Fragment key={r.value}>
                          <TableHead className="text-xs text-center px-1">Ver</TableHead>
                          <TableHead className="text-xs text-center px-1">Criar</TableHead>
                          <TableHead className="text-xs text-center px-1">Editar</TableHead>
                          <TableHead className="text-xs text-center px-1">Apagar</TableHead>
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
                              {['can_view', 'can_create', 'can_edit', 'can_delete'].map(action => (
                                <TableCell key={action} className="text-center px-1">
                                  <Checkbox
                                    checked={perm?.[action] ?? false}
                                    disabled
                                    className="mx-auto"
                                  />
                                </TableCell>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-4">
                  CEO e Admin têm acesso total automático. As permissões acima são apenas para referência visual.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGate>
  );
};

export default CompanyUsersPage;
