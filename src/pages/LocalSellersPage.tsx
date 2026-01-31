import React, { useState } from 'react';
import { useLocalPOS } from '@/contexts/LocalPOSContext';
import { useLocalAuth, LocalRole } from '@/contexts/LocalAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Pencil, 
  Trash2, 
  Search,
  Mail,
  Store,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

// 100% LOCAL - NO ASYNC, NO BACKEND

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: LocalRole;
  storeId: string;
  isActive: boolean;
}

const LocalSellersPage: React.FC = () => {
  const { stores } = useLocalPOS();
  const { hasAccess, getAllUsers, addUser, updateUser, deleteUser, user: currentUser } = useLocalAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<(ReturnType<typeof getAllUsers>[0]) | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const allUsers = getAllUsers();

  // Form state
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'vendedor',
    storeId: stores[0]?.id || '',
    isActive: true,
  });

  const isAdmin = hasAccess(['admin']);

  // Filter users
  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'vendedor',
      storeId: stores[0]?.id || '',
      isActive: true,
    });
    setEditingUser(null);
  };

  // Open form for new user
  const handleNewUser = () => {
    resetForm();
    setShowForm(true);
  };

  // Open form for editing
  const handleEdit = (user: ReturnType<typeof getAllUsers>[0]) => {
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Don't show password
      role: user.role as LocalRole,
      storeId: user.storeId || stores[0]?.id || '',
      isActive: true, // Assume active if not specified
    });
    setEditingUser(user);
    setShowForm(true);
  };

  // Save user
  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Email é obrigatório');
      return;
    }
    if (!editingUser && !formData.password) {
      toast.error('Senha é obrigatória');
      return;
    }

    // Check for duplicate email
    const existingUser = allUsers.find(
      u => u.email.toLowerCase() === formData.email.toLowerCase() && u.id !== editingUser?.id
    );
    if (existingUser) {
      toast.error('Email já cadastrado');
      return;
    }

    if (editingUser) {
      const updates: Partial<typeof editingUser> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        storeId: formData.storeId,
      };
      if (formData.password) {
        updates.password = formData.password;
      }
      updateUser(editingUser.id, updates);
      toast.success('Usuário atualizado');
    } else {
      addUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        storeId: formData.storeId,
      });
      toast.success('Usuário criado');
    }

    setShowForm(false);
    resetForm();
  };

  // Delete user
  const handleDelete = (id: string) => {
    if (id === currentUser?.id) {
      toast.error('Não é possível excluir seu próprio usuário');
      return;
    }
    deleteUser(id);
    toast.success('Usuário excluído');
    setDeleteConfirm(null);
  };

  // Get store name
  const getStoreName = (storeId?: string) => {
    if (!storeId) return 'Todas';
    const store = stores.find(s => s.id === storeId);
    return store?.name || 'Desconhecida';
  };

  // Get role label
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'vendedor': return 'Vendedor';
      case 'caixa': return 'Caixa';
      default: return role;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Vendedores / Usuários
          </h1>
          <p className="text-muted-foreground">
            {allUsers.length} usuários cadastrados
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleNewUser}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar usuário..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Nome</th>
                <th className="text-left p-4 font-medium">Email</th>
                <th className="text-left p-4 font-medium">Função</th>
                <th className="text-left p-4 font-medium">Loja</th>
                <th className="text-center p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div className="font-medium">{user.name}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {user.email}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      <Shield className="w-3 h-3 mr-1" />
                      {getRoleLabel(user.role)}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Store className="w-4 h-4" />
                      {getStoreName(user.storeId)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setDeleteConfirm(user.id)}
                            disabled={user.id === currentUser?.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum usuário encontrado</p>
          </div>
        )}
      </Card>

      {/* User Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Senha {editingUser ? '(deixe em branco para manter)' : '*'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Função *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: LocalRole) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="caixa">Caixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="store">Loja Associada</Label>
              <Select
                value={formData.storeId}
                onValueChange={(value) => setFormData({ ...formData, storeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a loja" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map(store => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingUser ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocalSellersPage;
