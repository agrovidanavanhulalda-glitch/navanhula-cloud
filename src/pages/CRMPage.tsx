import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Crown, Search, Plus, TrendingUp, ShoppingCart, Phone, Mail, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

interface Customer {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  total_spent: number;
  total_purchases: number;
  vip_level: string;
  last_purchase_at: string | null;
  store_id: string | null;
  created_at: string;
}

const VIP_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  platinum: { label: 'Platinum', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: <Crown className="w-3 h-3" /> },
  gold: { label: 'Gold', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: <Crown className="w-3 h-3" /> },
  silver: { label: 'Silver', color: 'bg-gray-400/20 text-gray-300 border-gray-400/30', icon: <Crown className="w-3 h-3" /> },
  regular: { label: 'Regular', color: 'bg-muted text-muted-foreground', icon: null },
};

const CRMPage: React.FC = () => {
  const { user, role } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ full_name: '', phone: '', email: '', address: '', notes: '' });

  const isAdmin = role === 'admin' || role === 'manager' || role === 'ceo';

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('total_spent', { ascending: false });
      if (error) throw error;
      setCustomers((data as unknown as Customer[]) || []);
    } catch (e) {
      console.error('CRM load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCustomers(); }, []);

  const handleSave = async () => {
    if (!formData.full_name.trim()) { toast.error('Nome obrigatório'); return; }
    try {
      if (selectedCustomer) {
        const { error } = await supabase.from('customers').update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          notes: formData.notes || null,
        }).eq('id', selectedCustomer.id);
        if (error) throw error;
        toast.success('Cliente atualizado');
      } else {
        const { error } = await supabase.from('customers').insert({
          full_name: formData.full_name,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          notes: formData.notes || null,
          store_id: user?.store_id || null,
          created_by: user?.id || '',
        });
        if (error) throw error;
        toast.success('Cliente criado');
      }
      setShowForm(false);
      setSelectedCustomer(null);
      setFormData({ full_name: '', phone: '', email: '', address: '', notes: '' });
      loadCustomers();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    }
  };

  const filtered = customers.filter(c =>
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: customers.length,
    vip: customers.filter(c => c.vip_level !== 'regular').length,
    totalSpent: customers.reduce((s, c) => s + Number(c.total_spent || 0), 0),
    avgPurchases: customers.length > 0 ? Math.round(customers.reduce((s, c) => s + Number(c.total_purchases || 0), 0) / customers.length) : 0,
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">CRM — Gestão de Clientes</h1>
          <p className="text-muted-foreground">Histórico, fidelização e classificação VIP</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCustomers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          {isAdmin && (
            <Button onClick={() => { setSelectedCustomer(null); setFormData({ full_name: '', phone: '', email: '', address: '', notes: '' }); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Novo Cliente
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Users className="w-4 h-4" /> Total Clientes</div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Crown className="w-4 h-4" /> Clientes VIP</div>
          <p className="text-2xl font-bold text-primary">{stats.vip}</p>
        </Card>
        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="w-4 h-4" /> Receita Total</div>
          <p className="text-2xl font-bold pos-money">{formatCurrency(stats.totalSpent)}</p>
        </Card>
        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><ShoppingCart className="w-4 h-4" /> Média Compras</div>
          <p className="text-2xl font-bold">{stats.avgPurchases}</p>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, telefone ou email..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todos ({customers.length})</TabsTrigger>
          <TabsTrigger value="vip">VIP ({stats.vip})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <CustomerList customers={filtered} onEdit={(c) => { setSelectedCustomer(c); setFormData({ full_name: c.full_name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' }); setShowForm(true); }} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="vip" className="mt-4">
          <CustomerList customers={filtered.filter(c => c.vip_level !== 'regular')} onEdit={(c) => { setSelectedCustomer(c); setFormData({ full_name: c.full_name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' }); setShowForm(true); }} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCustomer ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome Completo *</Label><Input value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Telefone</Label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
            </div>
            <div><Label>Endereço</Label><Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} /></div>
            <div><Label>Notas</Label><Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CustomerList: React.FC<{ customers: Customer[]; onEdit: (c: Customer) => void; isAdmin: boolean }> = ({ customers, onEdit, isAdmin }) => (
  <div className="space-y-3">
    {customers.map(c => {
      const vip = VIP_CONFIG[c.vip_level] || VIP_CONFIG.regular;
      return (
        <Card key={c.id} className="p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => isAdmin && onEdit(c)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {c.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{c.full_name}</p>
                  {c.vip_level !== 'regular' && (
                    <Badge variant="outline" className={`text-xs ${vip.color}`}>{vip.icon} {vip.label}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                  {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold pos-money">{formatCurrency(Number(c.total_spent || 0))}</p>
              <p className="text-xs text-muted-foreground">{c.total_purchases || 0} compras</p>
            </div>
          </div>
        </Card>
      );
    })}
    {customers.length === 0 && (
      <div className="text-center py-12 text-muted-foreground">Nenhum cliente encontrado</div>
    )}
  </div>
);

export default CRMPage;
