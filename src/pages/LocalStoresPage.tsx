import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalPOS } from '@/contexts/LocalPOSContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { 
  Store, Plus, Pencil, Trash2, Search, MapPin, Phone, CheckCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface StoreRow {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  city: string | null;
  is_active: boolean;
  business_type: string | null;
  nuit: string | null;
  plan: string | null;
  fiscal_regime: string | null;
  default_min_stock: number | null;
  company_id: string | null;
}

const BUSINESS_TYPES = [
  { value: 'retail', label: 'Retalho' },
  { value: 'wholesale', label: 'Grossista' },
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'pharmacy', label: 'Farmácia' },
  { value: 'services', label: 'Serviços' },
  { value: 'other', label: 'Outro' },
];

const PLANS = [
  { value: 'basic', label: 'Básico' },
  { value: 'professional', label: 'Profissional' },
  { value: 'enterprise', label: 'Empresarial' },
];

const LocalStoresPage: React.FC = () => {
  const { role, company, store: activeStore } = useAuth();
  const { stores, loading, addStore, updateStore, deleteStore, refreshData } = useLocalPOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    city: '',
    address: '',
    phone: '',
    business_type: 'retail',
    nuit: '',
    plan: 'basic',
    fiscal_regime: 'irpc',
    default_min_stock: 10,
    is_active: true,
  });

  const isAdmin = role === 'admin' || role === 'ceo' || role === 'director' || role === 'manager';

  const filteredStores = stores.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.city || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '', city: '', address: '', phone: '',
      business_type: 'retail', nuit: '', plan: 'basic',
      fiscal_regime: 'irpc', default_min_stock: 10, is_active: true,
    });
    setEditingStore(null);
  };

  const handleNewStore = () => { resetForm(); setShowForm(true); };

  const handleEdit = (store: StoreRow) => {
    setFormData({
      name: store.name,
      city: store.city || '',
      address: store.address || '',
      phone: store.phone || '',
      business_type: store.business_type || 'retail',
      nuit: store.nuit || '',
      plan: store.plan || 'basic',
      fiscal_regime: store.fiscal_regime || 'irpc',
      default_min_stock: store.default_min_stock || 10,
      is_active: store.is_active,
    });
    setEditingStore(store);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!formData.city.trim()) { toast.error('Cidade é obrigatória'); return; }
    if (!formData.business_type) { toast.error('Tipo de negócio é obrigatório'); return; }

    setSaving(true);
    try {
      const storeData: any = {
        name: formData.name.trim(),
        address: (formData.address.trim() || null) as string,
        phone: (formData.phone.trim() || null) as string,
        isActive: formData.is_active,
        city: formData.city.trim(),
        business_type: formData.business_type,
        nuit: formData.nuit.trim() || null,
        plan: formData.plan,
        fiscal_regime: formData.fiscal_regime,
        default_min_stock: formData.default_min_stock,
      };

      if (editingStore) {
        await updateStore(editingStore.id, storeData);
      } else {
        await addStore(storeData);
      }

      setShowForm(false);
      resetForm();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (stores.length <= 1) { toast.error('Não é possível excluir a única loja'); return; }
    try {
      await deleteStore(id);
      setDeleteConfirm(null);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  const handleSelectStore = async (storeId: string) => {
    try {
      const { error } = await supabase.rpc('set_active_store', { p_store_id: storeId });
      if (error) throw error;
      toast.success('Loja selecionada');
      window.location.reload();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  const getBusinessLabel = (val: string | null) => BUSINESS_TYPES.find(b => b.value === val)?.label || val || '—';

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Store className="w-6 h-6" /> Lojas</h1>
          <p className="text-muted-foreground">{stores.length} lojas cadastradas</p>
        </div>
        {isAdmin && (
          <Button onClick={handleNewStore}><Plus className="w-4 h-4 mr-2" /> Nova Loja</Button>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input placeholder="Buscar loja..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 max-w-md" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStores.map(store => (
            <Card key={store.id} className={`p-6 ${store.id === activeStore?.id ? 'ring-2 ring-primary' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Store className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{store.name}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={store.is_active ? 'default' : 'secondary'}>{store.is_active ? 'Ativa' : 'Inativa'}</Badge>
                      {store.id === activeStore?.id && (
                        <Badge variant="outline" className="gap-1"><CheckCircle className="w-3 h-3" /> Atual</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1 mb-4 text-sm text-muted-foreground">
                {store.city && <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {store.city}{store.address ? ` — ${store.address}` : ''}</p>}
                {store.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> {store.phone}</p>}
                <p className="text-xs">{getBusinessLabel(store.business_type)} • {(store.fiscal_regime || 'irpc').toUpperCase()}</p>
              </div>

              <div className="flex items-center gap-2">
                {store.id !== activeStore?.id && (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleSelectStore(store.id)}>Selecionar</Button>
                )}
                {isAdmin && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(store)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteConfirm(store.id)} disabled={stores.length <= 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredStores.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma loja encontrada</p>
        </div>
      )}

      {/* Store Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStore ? 'Editar Loja' : 'Nova Loja'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Loja *</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Nome da loja" />
              </div>
              <div className="space-y-2">
                <Label>Cidade *</Label>
                <Input value={formData.city} onChange={e => setFormData(p => ({ ...p, city: e.target.value }))} placeholder="Maputo, Beira..." />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Negócio *</Label>
                <Select value={formData.business_type} onValueChange={v => setFormData(p => ({ ...p, business_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>NUIT</Label>
                <Input value={formData.nuit} onChange={e => setFormData(p => ({ ...p, nuit: e.target.value }))} placeholder="Número fiscal" />
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={formData.plan} onValueChange={v => setFormData(p => ({ ...p, plan: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLANS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Regime Fiscal</Label>
                <Select value={formData.fiscal_regime} onValueChange={v => setFormData(p => ({ ...p, fiscal_regime: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="irpc">IRPC — 3%</SelectItem>
                    <SelectItem value="ispc">ISPC — 5%</SelectItem>
                    <SelectItem value="iva">IVA — 16%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="Endereço completo" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="+258 84 000 0000" />
              </div>
              <div className="space-y-2">
                <Label>Estoque Mínimo Padrão</Label>
                <Input type="number" value={formData.default_min_stock} onChange={e => setFormData(p => ({ ...p, default_min_stock: parseInt(e.target.value) || 10 }))} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Loja Ativa</Label>
              <Switch checked={formData.is_active} onCheckedChange={v => setFormData(p => ({ ...p, is_active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingStore ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Tem certeza que deseja excluir esta loja? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocalStoresPage;
