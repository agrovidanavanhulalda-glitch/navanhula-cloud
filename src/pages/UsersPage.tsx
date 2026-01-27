import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getRoleLabel } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Plus,
  Edit,
  Shield,
  Store,
  Search,
} from 'lucide-react';
import type { Profile, Store as StoreType, AppRole } from '@/types/pos';
import { toast } from 'sonner';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [newUserModal, setNewUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', store_id: '', role: 'seller' as AppRole });
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        store:stores(*),
        user_roles(role)
      `)
      .order('full_name');

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    setUsers(data || []);
    setLoading(false);
  };

  const fetchStores = async () => {
    const { data } = await supabase
      .from('stores')
      .select('*')
      .eq('is_active', true)
      .order('name');

    setStores(data as StoreType[] || []);
  };

  useEffect(() => {
    fetchUsers();
    fetchStores();
  }, []);

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          store_id: selectedUser.store_id,
          is_active: selectedUser.is_active,
        })
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      // Update role
      if (selectedUser.newRole) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUser.id);

        await supabase
          .from('user_roles')
          .insert({
            user_id: selectedUser.id,
            role: selectedUser.newRole,
          });
      }

      toast.success('Usuário atualizado!');
      setEditModal(false);
      fetchUsers();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: newUser.full_name,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar usuário');

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: newUser.email,
          full_name: newUser.full_name,
          store_id: newUser.store_id || null,
        });

      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: newUser.role,
        });

      if (roleError) throw roleError;

      toast.success('Usuário criado com sucesso!');
      setNewUserModal(false);
      setNewUser({ email: '', password: '', full_name: '', store_id: '', role: 'seller' });
      fetchUsers();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditUser = (user: any) => {
    setSelectedUser({
      ...user,
      newRole: user.user_roles?.[0]?.role || 'seller',
    });
    setEditModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
        </div>
        <Button className="pos-button-primary" onClick={() => setNewUserModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pos-search"
        />
      </div>

      {/* Users Table */}
      <div className="pos-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="pos-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Loja</th>
                <th>Nível</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5}>
                      <div className="h-12 pos-skeleton" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {user.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {user.store && (
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-muted-foreground" />
                          {user.store.name}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        {getRoleLabel(user.user_roles?.[0]?.role || 'seller')}
                      </div>
                    </td>
                    <td>
                      <span className={`pos-badge ${user.is_active ? 'pos-badge-success' : 'pos-badge-error'}`}>
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditUser(user)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              {selectedUser?.full_name} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Loja</Label>
              <Select
                value={selectedUser?.store_id || ''}
                onValueChange={(v) => setSelectedUser((u: any) => ({ ...u, store_id: v }))}
              >
                <SelectTrigger className="pos-input">
                  <SelectValue placeholder="Selecionar loja..." />
                </SelectTrigger>
                <SelectContent>
                  {stores.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Select
                value={selectedUser?.newRole || 'seller'}
                onValueChange={(v) => setSelectedUser((u: any) => ({ ...u, newRole: v }))}
              >
                <SelectTrigger className="pos-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seller">Vendedor</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span>Status</span>
              <button
                onClick={() => setSelectedUser((u: any) => ({ ...u, is_active: !u.is_active }))}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedUser?.is_active ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
                }`}
              >
                {selectedUser?.is_active ? 'Ativo' : 'Inativo'}
              </button>
            </div>

            <Button
              className="w-full pos-button-primary h-12"
              onClick={handleUpdateUser}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New User Modal */}
      <Dialog open={newUserModal} onOpenChange={setNewUserModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo usuário para o sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                value={newUser.full_name}
                onChange={(e) => setNewUser(u => ({ ...u, full_name: e.target.value }))}
                className="pos-input"
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(u => ({ ...u, email: e.target.value }))}
                className="pos-input"
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Senha *</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser(u => ({ ...u, password: e.target.value }))}
                className="pos-input"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loja</Label>
                <Select
                  value={newUser.store_id}
                  onValueChange={(v) => setNewUser(u => ({ ...u, store_id: v }))}
                >
                  <SelectTrigger className="pos-input">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nível de Acesso</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(v) => setNewUser(u => ({ ...u, role: v as AppRole }))}
                >
                  <SelectTrigger className="pos-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seller">Vendedor</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full pos-button-primary h-12"
              onClick={handleCreateUser}
              disabled={saving}
            >
              {saving ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
