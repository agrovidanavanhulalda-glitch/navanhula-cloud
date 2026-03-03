import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Plus, Search, RefreshCw, Package, ClipboardList, Phone, Mail, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  total_debt: number;
  created_at: string;
}

interface PurchaseOrder {
  id: string;
  supplier_id: string;
  store_id: string;
  status: string;
  total: number;
  notes: string | null;
  created_at: string;
}

const SuppliersPage: React.FC = () => {
  const { user, role, company } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ name: '', contact_name: '', phone: '', email: '', address: '', notes: '' });

  // Order form
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderData, setOrderData] = useState({ supplier_id: '', notes: '' });

  const isAdmin = role === 'admin' || role === 'manager' || role === 'ceo';

  const loadData = async () => {
    setLoading(true);
    try {
      const [suppRes, ordRes] = await Promise.all([
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      if (suppRes.data) setSuppliers(suppRes.data as unknown as Supplier[]);
      if (ordRes.data) setOrders(ordRes.data as unknown as PurchaseOrder[]);
    } catch (e) {
      console.error('Suppliers load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSaveSupplier = async () => {
    if (!formData.name.trim()) { toast.error('Nome obrigatório'); return; }
    try {
      const companyId = company?.id;
      if (editingSupplier) {
        const { error } = await supabase.from('suppliers').update({
          name: formData.name,
          contact_name: formData.contact_name || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          notes: formData.notes || null,
        }).eq('id', editingSupplier.id);
        if (error) throw error;
        toast.success('Fornecedor atualizado');
      } else {
        const { error } = await supabase.from('suppliers').insert({
          name: formData.name,
          contact_name: formData.contact_name || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          notes: formData.notes || null,
          company_id: companyId,
        });
        if (error) throw error;
        toast.success('Fornecedor criado');
      }
      setShowForm(false);
      setEditingSupplier(null);
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    }
  };

  const handleCreateOrder = async () => {
    if (!orderData.supplier_id) { toast.error('Selecione um fornecedor'); return; }
    try {
      const { error } = await supabase.from('purchase_orders').insert({
        supplier_id: orderData.supplier_id,
        store_id: user?.store_id,
        company_id: company?.id,
        ordered_by: user?.id,
        notes: orderData.notes || null,
        status: 'draft',
      });
      if (error) throw error;
      toast.success('Pedido criado como rascunho');
      setShowOrderForm(false);
      setOrderData({ supplier_id: '', notes: '' });
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar pedido');
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'approved') updateData.approved_by = user?.id;
      if (newStatus === 'received') updateData.received_at = new Date().toISOString();
      const { error } = await supabase.from('purchase_orders').update(updateData).eq('id', orderId);
      if (error) throw error;
      toast.success(`Pedido ${newStatus === 'approved' ? 'aprovado' : newStatus === 'received' ? 'recebido' : 'atualizado'}`);
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalDebt = suppliers.reduce((s, sp) => s + Number(sp.total_debt || 0), 0);

  const STATUS_MAP: Record<string, { label: string; class: string }> = {
    draft: { label: 'Rascunho', class: 'bg-muted text-muted-foreground' },
    pending: { label: 'Pendente', class: 'bg-warning/20 text-warning' },
    approved: { label: 'Aprovado', class: 'bg-primary/20 text-primary' },
    received: { label: 'Recebido', class: 'bg-success/20 text-success' },
    cancelled: { label: 'Cancelado', class: 'bg-destructive/20 text-destructive' },
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Compras & Fornecedores</h1>
          <p className="text-muted-foreground">Gestão de fornecedores e pedidos de compra</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setShowOrderForm(true)}>
                <ClipboardList className="w-4 h-4 mr-2" /> Novo Pedido
              </Button>
              <Button onClick={() => { setEditingSupplier(null); setFormData({ name: '', contact_name: '', phone: '', email: '', address: '', notes: '' }); setShowForm(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Truck className="w-4 h-4" /> Fornecedores</div>
          <p className="text-2xl font-bold">{suppliers.length}</p>
        </Card>
        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><ClipboardList className="w-4 h-4" /> Pedidos</div>
          <p className="text-2xl font-bold">{orders.length}</p>
        </Card>
        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Package className="w-4 h-4" /> Pendentes</div>
          <p className="text-2xl font-bold text-warning">{orders.filter(o => o.status === 'pending' || o.status === 'draft').length}</p>
        </Card>
        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><AlertTriangle className="w-4 h-4" /> Dívida Total</div>
          <p className={`text-2xl font-bold ${totalDebt > 0 ? 'text-destructive' : ''}`}>{formatCurrency(totalDebt)}</p>
        </Card>
      </div>

      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
          <TabsTrigger value="orders">Pedidos de Compra</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar fornecedor..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="space-y-3">
            {filtered.map(s => (
              <Card key={s.id} className="p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => {
                if (isAdmin) {
                  setEditingSupplier(s);
                  setFormData({ name: s.name, contact_name: s.contact_name || '', phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' });
                  setShowForm(true);
                }
              }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {s.contact_name && <span>{s.contact_name}</span>}
                        {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                        {s.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {Number(s.total_debt) > 0 && (
                      <p className="text-sm font-bold text-destructive">Dívida: {formatCurrency(Number(s.total_debt))}</p>
                    )}
                    <Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Ativo' : 'Inativo'}</Badge>
                  </div>
                </div>
              </Card>
            ))}
            {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">Nenhum fornecedor encontrado</div>}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <div className="space-y-3">
            {orders.map(o => {
              const supplier = suppliers.find(s => s.id === o.supplier_id);
              const st = STATUS_MAP[o.status] || STATUS_MAP.draft;
              return (
                <Card key={o.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{supplier?.name || 'Fornecedor'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('pt-BR')} — {o.notes || 'Sem notas'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={st.class}>{st.label}</Badge>
                      <span className="font-bold pos-money">{formatCurrency(Number(o.total))}</span>
                      {isAdmin && o.status === 'draft' && (
                        <Button size="sm" variant="outline" onClick={() => updateOrderStatus(o.id, 'pending')}>Enviar</Button>
                      )}
                      {isAdmin && o.status === 'pending' && (
                        <Button size="sm" onClick={() => updateOrderStatus(o.id, 'approved')}>Aprovar</Button>
                      )}
                      {isAdmin && o.status === 'approved' && (
                        <Button size="sm" variant="outline" onClick={() => updateOrderStatus(o.id, 'received')}>Recebido</Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
            {orders.length === 0 && <div className="text-center py-12 text-muted-foreground">Nenhum pedido de compra</div>}
          </div>
        </TabsContent>
      </Tabs>

      {/* Supplier Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
            <div><Label>Contacto</Label><Input value={formData.contact_name} onChange={e => setFormData({ ...formData, contact_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Telefone</Label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
            </div>
            <div><Label>Endereço</Label><Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} /></div>
            <div><Label>Notas</Label><Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSaveSupplier}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Form */}
      <Dialog open={showOrderForm} onOpenChange={setShowOrderForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Pedido de Compra</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fornecedor *</Label>
              <Select value={orderData.supplier_id} onValueChange={v => setOrderData({ ...orderData, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {suppliers.filter(s => s.is_active).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notas</Label><Textarea value={orderData.notes} onChange={e => setOrderData({ ...orderData, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderForm(false)}>Cancelar</Button>
            <Button onClick={handleCreateOrder}>Criar Pedido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuppliersPage;
