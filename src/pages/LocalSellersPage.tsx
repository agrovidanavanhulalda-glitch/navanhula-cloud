import React, { useState } from 'react';
import { useLocalPOS, LocalSeller } from '@/contexts/LocalPOSContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import { 
  Users, 
  Plus, 
  Search,
  Mail,
  Store,
  Shield,
  Edit,
  Trash2,
  UserCheck,
  UserX
} from 'lucide-react';
import { toast } from 'sonner';

// 100% LOCAL - Gestão de vendedores offline-friendly

const LocalSellersPage: React.FC = () => {
  const { 
    sellers, 
    stores,
    currentStore,
    addSeller, 
    updateSeller, 
    deleteSeller 
  } = useLocalPOS();

  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingSeller, setEditingSeller] = useState<LocalSeller | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'vendedor' as 'admin' | 'vendedor',
    storeId: currentStore.id,
    password: '1234',
    isActive: true,
  });

  // Filter sellers
  const filteredSellers = sellers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get store name - human readable
  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    return store?.name || 'Loja Principal';
  };

  // Get role label - human readable
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'vendedor': return 'Vendedor';
      default: return 'Vendedor';
    }
  };

  // Open dialog for new seller
  const handleNew = () => {
    setEditingSeller(null);
    setFormData({
      name: '',
      email: '',
      role: 'vendedor',
      storeId: currentStore.id,
      password: '1234',
      isActive: true,
    });
    setShowDialog(true);
  };

  // Open dialog for editing
  const handleEdit = (seller: LocalSeller) => {
    setEditingSeller(seller);
    setFormData({
      name: seller.name,
      email: seller.email,
      role: seller.role,
      storeId: seller.storeId,
      password: seller.password,
      isActive: seller.isActive,
    });
    setShowDialog(true);
  };

  // Save seller
  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (editingSeller) {
      updateSeller(editingSeller.id, formData);
      toast.success('Vendedor atualizado!');
    } else {
      addSeller(formData);
      toast.success('Vendedor criado!');
    }

    setShowDialog(false);
    setEditingSeller(null);
  };

  // Toggle active status
  const handleToggleActive = (seller: LocalSeller) => {
    updateSeller(seller.id, { isActive: !seller.isActive });
    toast.success(seller.isActive ? 'Vendedor desativado' : 'Vendedor ativado');
  };

  // Delete seller
  const handleDelete = (seller: LocalSeller) => {
    if (window.confirm(`Remover vendedor "${seller.name}"?`)) {
      deleteSeller(seller.id);
      toast.success('Vendedor removido');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Vendedores
          </h1>
          <p className="text-muted-foreground">
            Gestão de vendedores da loja
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Vendedor
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar vendedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Sellers List */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Vendedor</th>
                <th className="text-left p-4 font-medium">Email</th>
                <th className="text-left p-4 font-medium">Função</th>
                <th className="text-left p-4 font-medium">Loja</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-right p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSellers.map((seller) => (
                <tr key={seller.id} className="hover:bg-muted/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        seller.isActive ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        {seller.isActive ? (
                          <UserCheck className="w-5 h-5 text-primary" />
                        ) : (
                          <UserX className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="font-medium">{seller.name}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {seller.email}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={seller.role === 'admin' ? 'default' : 'secondary'}>
                      <Shield className="w-3 h-3 mr-1" />
                      {getRoleLabel(seller.role)}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Store className="w-4 h-4" />
                      {getStoreName(seller.storeId)}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={seller.isActive ? 'default' : 'secondary'} className={
                      seller.isActive ? 'bg-green-500' : ''
                    }>
                      {seller.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleToggleActive(seller)}
                      >
                        {seller.isActive ? (
                          <UserX className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit(seller)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(seller)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSellers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum vendedor encontrado</p>
            <Button variant="link" onClick={handleNew}>
              Criar primeiro vendedor
            </Button>
          </div>
        )}
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSeller ? 'Editar Vendedor' : 'Novo Vendedor'}
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Função</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value: 'admin' | 'vendedor') => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Loja</Label>
              <Select 
                value={formData.storeId} 
                onValueChange={(value) => setFormData({ ...formData, storeId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
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

            <div className="space-y-2">
              <Label htmlFor="password">Senha (PIN)</Label>
              <Input
                id="password"
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="1234"
              />
              <p className="text-xs text-muted-foreground">
                Senha para acesso rápido ao PDV
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Vendedor Ativo</Label>
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingSeller ? 'Salvar' : 'Criar Vendedor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocalSellersPage;
