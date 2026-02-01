import React, { useState } from 'react';
import { useLocalPOS, LocalStore } from '@/contexts/LocalPOSContext';
import { useAuth } from '@/contexts/SaaSAuthContext';
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
  Store, 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  MapPin,
  Phone,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

// HYBRID: Local POS data + SaaS Auth

const LocalStoresPage: React.FC = () => {
  const { stores, currentStore, addStore, updateStore, deleteStore, setCurrentStore } = useLocalPOS();
  const { role } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<LocalStore | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    isActive: true,
  });

  const isAdmin = role === 'admin' || role === 'manager';

  // Filter stores
  const filteredStores = stores.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      isActive: true,
    });
    setEditingStore(null);
  };

  // Open form for new store
  const handleNewStore = () => {
    resetForm();
    setShowForm(true);
  };

  // Open form for editing
  const handleEdit = (store: LocalStore) => {
    setFormData({
      name: store.name,
      address: store.address,
      phone: store.phone,
      isActive: store.isActive,
    });
    setEditingStore(store);
    setShowForm(true);
  };

  // Save store
  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    const storeData = {
      name: formData.name.trim(),
      address: formData.address.trim(),
      phone: formData.phone.trim(),
      isActive: formData.isActive,
    };

    if (editingStore) {
      updateStore(editingStore.id, storeData);
      toast.success('Loja atualizada');
    } else {
      addStore(storeData);
      toast.success('Loja criada');
    }

    setShowForm(false);
    resetForm();
  };

  // Delete store
  const handleDelete = (id: string) => {
    if (stores.length <= 1) {
      toast.error('Não é possível excluir a única loja');
      return;
    }
    deleteStore(id);
    toast.success('Loja excluída');
    setDeleteConfirm(null);
  };

  // Select store
  const handleSelectStore = (storeId: string) => {
    setCurrentStore(storeId);
    toast.success('Loja selecionada');
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="w-6 h-6" />
            Lojas
          </h1>
          <p className="text-muted-foreground">
            {stores.length} lojas cadastradas
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleNewStore}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Loja
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar loja..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStores.map((store) => (
          <Card 
            key={store.id} 
            className={`p-6 ${store.id === currentStore.id ? 'ring-2 ring-primary' : ''}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Store className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{store.name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant={store.isActive ? 'default' : 'secondary'}>
                      {store.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                    {store.id === currentStore.id && (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Atual
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {store.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {store.address}
                </p>
              )}
              {store.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {store.phone}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {store.id !== currentStore.id && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleSelectStore(store.id)}
                >
                  Selecionar
                </Button>
              )}
              {isAdmin && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(store)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleteConfirm(store.id)}
                    disabled={stores.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredStores.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma loja encontrada</p>
        </div>
      )}

      {/* Store Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStore ? 'Editar Loja' : 'Nova Loja'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome da loja"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Endereço completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+258 84 000 0000"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Loja Ativa</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingStore ? 'Salvar' : 'Criar'}
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
            Tem certeza que deseja excluir esta loja? Esta ação não pode ser desfeita.
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

export default LocalStoresPage;
