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
import { toast } from 'sonner';
import { Users, Plus, Shield, Link2, Copy, Check, Ban, UserCheck, Trash2, UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';

const VALID_TECHNICAL_ROLES = ['ceo', 'admin', 'manager', 'seller', 'driver', 'reseller'];

const CompanyUsersPage = () => {
  const { company, user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id;
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [inviteForm, setInviteForm] = useState({ role_id: '', email: '', branch_id: '' });
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [createUserForm, setCreateUserForm] = useState({ full_name: '', email: '', role_id: '', password: '', branch_id: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);

  // Fetch Roles
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('roles').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch Branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').eq('company_id', companyId!);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Fetch members
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team-members', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_users')
        .select(`
          *,
          profiles:user_id(full_name, email)
        `)
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Fetch invitations
  const { data: invitations = [] } = useQuery({
    queryKey: ['team-invites', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invites')
        .select(`
          *,
          roles(name, key)
        `)
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Invite user via standard invites table
  const inviteUser = useMutation({
    mutationFn: async () => {
      const email = inviteForm.email.trim().toLowerCase();
      const roleId = inviteForm.role_id;
      const branchId = inviteForm.branch_id || null;

      if (!email) throw new Error('O email é obrigatório');
      if (!roleId) throw new Error('O cargo é obrigatório');

      const selectedRole = roles.find(r => r.id === roleId);
      const roleKey = selectedRole?.key?.toLowerCase();

      // Client-side validation for technical role key
      if (!roleKey || !VALID_TECHNICAL_ROLES.includes(roleKey)) {
        throw new Error(`Cargo técnico inválido: "${roleKey || 'não definido'}". Selecione um cargo válido (admin, manager, seller, etc).`);
      }
      
      const { data, error } = await supabase
        .from('invites')
        .insert({
          company_id: companyId,
          email: email,
          role_id: roleId,
          branch_id: branchId,
          invited_by: user?.id,
          status: 'pending'
        } as any)
        .select('token')
        .single();

      if (error) throw error;
      return { token: data.token };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-invites'] });
      const inviteLink = `${window.location.origin}/convite/${data.token}`;
      setGeneratedInviteLink(inviteLink);
      navigator.clipboard.writeText(inviteLink);
      toast.success('Convite gerado com sucesso!');
    },
    onError: (e: any) => toast.error('Erro ao convidar: ' + e.message),
  });

  // Create user via Auth API
  const createUser = useMutation({
    mutationFn: async () => {
      const email = createUserForm.email.trim().toLowerCase();
      const password = createUserForm.password;
      const name = createUserForm.full_name;
      const branchId = createUserForm.branch_id || null;
      
      if (!email) throw new Error('O email é obrigatório');
      if (!password || password.length < 6) throw new Error('Senha deve ter pelo menos 6 caracteres');
      if (!name) throw new Error('O nome é obrigatório');
      if (!createUserForm.role_id) throw new Error('O cargo é obrigatório');

      const selectedRole = roles.find(r => r.id === createUserForm.role_id);
      
      // FORÇAR USO DA ROLE KEY TÉCNICA (seller/manager/admin)
      const roleKey = selectedRole?.key?.toLowerCase();
      
      if (!roleKey || !VALID_TECHNICAL_ROLES.includes(roleKey)) {
        throw new Error(`Cargo técnico inválido: "${roleKey || 'não definido'}". Selecione um cargo válido.`);
      }
      
      // Criar utilizador via Auth - O trigger do banco tratará Profile e CompanyUser automaticamente
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            company_id: companyId,
            branch_id: branchId,
            role: roleKey, // Envia sempre a key técnica
            actor_id: user?.id // Para auditoria detalhada
          }
        }
      });

      if (authError) throw authError;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Utilizador criado. Ele deve verificar o email para activar a conta.');
      setShowCreateUser(false);
      setCreateUserForm({ full_name: '', email: '', role_id: '', password: '', branch_id: '' });
    },
    onError: (e: any) => toast.error('Erro ao criar utilizador: ' + e.message),
  });

  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'ceo': return 'destructive';
      case 'admin': return 'default';
      case 'gerente': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <PermissionGate module="users">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestão de Equipa</h1>
            <p className="text-sm text-muted-foreground">Gerencie os membros da sua empresa e seus acessos.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowInvite(true)} className="gap-2">
              <Link2 className="w-4 h-4" /> Convidar
            </Button>
            <Button onClick={() => setShowCreateUser(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Criar Utilizador
            </Button>
          </div>
        </div>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" /> Membros da Equipa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
                ) : members.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum membro encontrado.</TableCell></TableRow>
                ) : members.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.profiles?.full_name}</TableCell>
                    <TableCell>{m.profiles?.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(m.role || '')}>
                        {m.role || 'Sem Cargo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === 'active' ? 'success' : 'outline' as any}>
                        {m.status === 'active' ? 'Ativo' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive"
                        onClick={async () => {
                          if (confirm('Deseja realmente remover este membro?')) {
                            const { error } = await supabase.from('company_users').delete().eq('id', m.id);
                            if (error) toast.error('Erro ao remover: ' + error.message);
                            else {
                              toast.success('Membro removido');
                              queryClient.invalidateQueries({ queryKey: ['team-members'] });
                            }
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pending Invites */}
        {invitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Convites Pendentes</CardTitle>
            </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.token.substring(0, 8)}...</TableCell>
                    <TableCell>{inv.roles?.name || 'Membro'}</TableCell>
                    <TableCell>{inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="text-right flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => {
                        const link = `${window.location.origin}/convite/${inv.token}`;
                        navigator.clipboard.writeText(link);
                        toast.success('Link copiado!');
                      }}>
                        <Link2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive"
                        onClick={async () => {
                          if (confirm('Cancelar este convite?')) {
                            const { error } = await supabase.from('invites').delete().eq('id', inv.id);
                            if (error) toast.error('Erro ao cancelar: ' + error.message);
                            else {
                              toast.success('Convite cancelado');
                              queryClient.invalidateQueries({ queryKey: ['team-invites'] });
                            }
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          </Card>
        )}

        {/* Invite Dialog */}
        <Dialog open={showInvite} onOpenChange={(open) => {
          setShowInvite(open);
          if (!open) {
            setGeneratedInviteLink(null);
            setInviteForm({ role_id: '', email: '', branch_id: '' });
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{generatedInviteLink ? 'Convite Gerado' : 'Convidar para a Equipa'}</DialogTitle>
            </DialogHeader>
            
            {generatedInviteLink ? (
              <div className="space-y-4 py-4">
                <div className="flex flex-col items-center justify-center space-y-2 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Check className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium">Link de convite pronto!</p>
                  <p className="text-xs text-muted-foreground">Partilhe este link com o colaborador para que ele se possa registar.</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Link de Convite</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      readOnly 
                      value={generatedInviteLink} 
                      className="bg-muted font-mono text-xs h-9"
                    />
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="shrink-0 gap-2"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedInviteLink);
                        toast.success('Link copiado!');
                      }}
                    >
                      <Copy className="w-4 h-4" /> Copiar Link
                    </Button>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button className="w-full" onClick={() => setShowInvite(false)}>Fechar</Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Email do Colaborador</Label>
                  <Input 
                    placeholder="email@exemplo.com" 
                    value={inviteForm.email}
                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Select 
                    value={inviteForm.role_id}
                    onValueChange={v => setInviteForm({ ...inviteForm, role_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r: any) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {inviteForm.role_id && !VALID_TECHNICAL_ROLES.includes(roles.find(r => r.id === inviteForm.role_id)?.key?.toLowerCase() || '') && (
                    <p className="text-xs text-destructive mt-1">Este cargo não possui uma chave técnica válida.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Branch / Loja (Opcional)</Label>
                  <Select 
                    value={inviteForm.branch_id}
                    onValueChange={v => setInviteForm({ ...inviteForm, branch_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button 
                    className="w-full"
                    onClick={() => inviteUser.mutate()} 
                    disabled={
                      inviteUser.isPending || 
                      !inviteForm.email || 
                      !inviteForm.role_id || 
                      !VALID_TECHNICAL_ROLES.includes(roles.find(r => r.id === inviteForm.role_id)?.key?.toLowerCase() || '')
                    }
                  >
                    {inviteUser.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gerar Convite'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create User Dialog */}
        <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Utilizador</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input 
                  placeholder="João Silva" 
                  value={createUserForm.full_name}
                  onChange={e => setCreateUserForm({ ...createUserForm, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  placeholder="joao@exemplo.com" 
                  value={createUserForm.email}
                  onChange={e => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Senha Temporária</Label>
                <Input 
                  type="password"
                  placeholder="••••••••" 
                  value={createUserForm.password}
                  onChange={e => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Select 
                  value={createUserForm.role_id}
                  onValueChange={v => setCreateUserForm({ ...createUserForm, role_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                {createUserForm.role_id && !VALID_TECHNICAL_ROLES.includes(roles.find(r => r.id === createUserForm.role_id)?.key?.toLowerCase() || '') && (
                  <p className="text-xs text-destructive mt-1">Este cargo não possui uma chave técnica válida e não pode ser usado.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Branch / Loja (Opcional)</Label>
                <Select 
                  value={createUserForm.branch_id}
                  onValueChange={v => setCreateUserForm({ ...createUserForm, branch_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => createUser.mutate()} 
                disabled={
                  createUser.isPending || 
                  !createUserForm.email || 
                  !createUserForm.role_id ||
                  !VALID_TECHNICAL_ROLES.includes(roles.find(r => r.id === createUserForm.role_id)?.key?.toLowerCase() || '')
                }
              >
                {createUser.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Utilizador'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
};

export default CompanyUsersPage;
