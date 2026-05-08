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

const CompanyUsersPage = () => {
  const { company, user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id;
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [inviteForm, setInviteForm] = useState({ role_id: '', email: '' });
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [createUserForm, setCreateUserForm] = useState({ full_name: '', email: '', role_id: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Roles
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('roles').select('*');
      if (error) throw error;
      return data;
    },
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
        .from('company_invitations')
        .select(`*`)
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Invite user via edge function
  const inviteUser = useMutation({
    mutationFn: async () => {
      const email = inviteForm.email.trim().toLowerCase();
      const roleName = roles.find(r => r.id === inviteForm.role_id)?.name || 'Vendedor';
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase
        .from('company_invitations')
        .insert({
          company_id: companyId,
          role: roleName,
          token: token,
          expires_at: expiresAt.toISOString(),
          created_by: user?.id,
          max_uses: 1,
          status: 'active',
        });

      if (error) throw error;
      return { token };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-invites'] });
      const inviteLink = `${window.location.origin}/convite/${data.token}`;
      navigator.clipboard.writeText(inviteLink);
      toast.success('Convite gerado com sucesso!');
      toast.info('Link copiado: ' + inviteLink);
      setShowInvite(false);
      setInviteForm({ role_id: '', email: '' });
    },
    onError: (e: any) => toast.error('Erro ao convidar: ' + e.message),
  });

  // Create user via Auth API
  const createUser = useMutation({
    mutationFn: async () => {
      const email = createUserForm.email.trim().toLowerCase();
      const password = createUserForm.password;
      const name = createUserForm.full_name;
      
      // 1. Criar utilizador no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            company_id: companyId,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Inserir perfil
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: authData.user.id,
          full_name: name,
          email: email,
          company_id: companyId,
          status: 'active'
        });

        if (profileError) throw profileError;

        // 3. Inserir na tabela de equipa
        const { error: teamError } = await supabase.from('user_company').upsert({
          user_id: authData.user.id,
          company_id: companyId,
          role_id: createUserForm.role_id,
          status: 'active'
        });

        if (teamError) throw teamError;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Utilizador criado com sucesso! Informe o utilizador para fazer login.');
      setShowCreateUser(false);
      setCreateUserForm({ full_name: '', email: '', role_id: '', password: '' });
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
                      <Badge variant={getRoleBadgeVariant(m.roles?.name || '')}>
                        {m.roles?.name || 'Sem Cargo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === 'active' ? 'success' : 'outline' as any}>
                        {m.status === 'active' ? 'Ativo' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-destructive">
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
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell>{inv.role}</TableCell>
                    <TableCell>{inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-destructive">
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
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar para a Equipa</DialogTitle>
            </DialogHeader>
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
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => inviteUser.mutate()} 
                disabled={inviteUser.isPending || !inviteForm.email || !inviteForm.role_id}
              >
                {inviteUser.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gerar Convite'}
              </Button>
            </DialogFooter>
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
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => createUser.mutate()} 
                disabled={createUser.isPending || !createUserForm.email || !createUserForm.role_id}
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
