import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Store,
  Plus,
  Edit,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import type { Store as StoreType } from '@/types/pos';
import { toast } from 'sonner';

const StoresPage: React.FC = () => {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editStore, setEditStore] = useState<Partial<StoreType> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchStores = async () => {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching stores:', error);
      return;
    }

    setStores(data as StoreType[] || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleSave = async () => {
    if (!editStore?.name) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      if (editStore.id) {
        const { error } = await supabase
          .from('stores')
          .update({
            name: editStore.name,
            address: editStore.address,
            phone: editStore.phone,
            email: editStore.email,
          })
          .eq('id', editStore.id);

        if (error) throw error;
        toast.success('Loja atualizada!');
      } else {
        const { error } = await supabase
          .from('stores')
          .insert({
            name: editStore.name,
            address: editStore.address,
            phone: editStore.phone,
            email: editStore.email,
          });

        if (error) throw error;
        toast.success('Loja criada!');
      }

      setEditModal(false);
      setEditStore(null);
      fetchStores();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const openNewStore = () => {
    setEditStore({ name: '', address: '', phone: '', email: '' });
    setEditModal(true);
  };

  const openEditStore = (store: StoreType) => {
    setEditStore(store);
    setEditModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lojas</h1>
          <p className="text-muted-foreground">Gerencie as lojas da rede</p>
        </div>
        <Button className="pos-button-primary" onClick={openNewStore}>
          <Plus className="w-5 h-5 mr-2" />
          Nova Loja
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="pos-card animate-pulse h-48" />
          ))
        ) : (
          stores.map((store) => (
            <div key={store.id} className="pos-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Store className="w-6 h-6 text-primary" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditStore(store)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>

              <h3 className="text-lg font-bold mb-3">{store.name}</h3>

              <div className="space-y-2 text-sm text-muted-foreground">
                {store.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{store.address}</span>
                  </div>
                )}
                {store.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{store.phone}</span>
                  </div>
                )}
                {store.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{store.email}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <span className={`pos-badge ${store.is_active ? 'pos-badge-success' : 'pos-badge-error'}`}>
                  {store.is_active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editStore?.id ? 'Editar Loja' : 'Nova Loja'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Loja *</Label>
              <Input
                value={editStore?.name || ''}
                onChange={(e) => setEditStore(s => ({ ...s, name: e.target.value }))}
                className="pos-input"
                placeholder="Nome da loja"
              />
            </div>

            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                value={editStore?.address || ''}
                onChange={(e) => setEditStore(s => ({ ...s, address: e.target.value }))}
                className="pos-input"
                placeholder="Endereço completo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={editStore?.phone || ''}
                  onChange={(e) => setEditStore(s => ({ ...s, phone: e.target.value }))}
                  className="pos-input"
                  placeholder="+258 84 000 0000"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={editStore?.email || ''}
                  onChange={(e) => setEditStore(s => ({ ...s, email: e.target.value }))}
                  className="pos-input"
                  placeholder="loja@email.com"
                />
              </div>
            </div>

            <Button
              className="w-full pos-button-primary h-12"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar Loja'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoresPage;
