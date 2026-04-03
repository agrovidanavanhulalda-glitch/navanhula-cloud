import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, MapPin, Phone, ShoppingCart, Plus, Egg, Search, AlertTriangle } from 'lucide-react';
import { z } from 'zod';
import ErrorBoundary from '@/components/ErrorBoundary';

interface Producer {
  id: string;
  company_id: string;
  nome_granja: string;
  latitude: number;
  longitude: number;
  tipo_produto: string;
  quantidade_disponivel: number;
  preco: number;
  telefone: string | null;
  foto_url: string | null;
  status: string;
  created_at: string;
}

const orderSchema = z.object({
  cliente_nome: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  cliente_contacto: z.string().trim().min(9, 'Contacto inválido').max(20),
  quantidade: z.number().int().min(1, 'Quantidade mínima é 1'),
});

// Lazy-loaded map component
const AgroMap = React.lazy(() => import('@/components/agro/AgroMapView'));

const AgroMapPageContent: React.FC = () => {
  const { user, company, loading: authLoading } = useAuth();
  const companyId = company?.id;
  const [producers, setProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [selectedProducer, setSelectedProducer] = useState<Producer | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [filterType, setFilterType] = useState<string>('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');

  const [orderForm, setOrderForm] = useState({ cliente_nome: '', cliente_contacto: '', quantidade: 1 });

  const [addForm, setAddForm] = useState({
    nome_granja: '', latitude: '', longitude: '', tipo_produto: 'frango',
    quantidade_disponivel: '', preco: '', telefone: '',
  });

  useEffect(() => {
    if (authLoading) return;
    
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setUserPosition([-15.12, 39.26])
    );
    fetchProducers();

    const channel = supabase
      .channel('agro-producers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agro_producers' }, () => fetchProducers())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authLoading]);

  const fetchProducers = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('agro_producers')
        .select('*')
        .eq('status', 'ativo')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[AgroMap] Fetch error:', error);
        setFetchError('Erro ao carregar produtores');
      } else {
        setProducers(data || []);
      }
    } catch (err) {
      console.error('[AgroMap] Unexpected error:', err);
      setFetchError('Erro inesperado ao carregar dados');
    }
    setLoading(false);
  };

  const filteredProducers = useMemo(() => {
    return producers.filter(p => {
      if (filterType !== 'all' && p.tipo_produto !== filterType) return false;
      if (filterSearch && !p.nome_granja.toLowerCase().includes(filterSearch.toLowerCase())) return false;
      if (filterMaxPrice && p.preco > parseFloat(filterMaxPrice)) return false;
      return true;
    });
  }, [producers, filterType, filterSearch, filterMaxPrice]);

  const handleOrder = async () => {
    if (!selectedProducer || !companyId) return;
    const parsed = orderSchema.safeParse(orderForm);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    if (orderForm.quantidade > selectedProducer.quantidade_disponivel) {
      toast.error('Quantidade indisponível');
      return;
    }
    setSubmitting(true);
    const total = orderForm.quantidade * selectedProducer.preco;
    const { error } = await supabase.from('agro_orders').insert({
      company_id: companyId,
      producer_id: selectedProducer.id,
      cliente_nome: orderForm.cliente_nome.trim(),
      cliente_contacto: orderForm.cliente_contacto.trim(),
      quantidade: orderForm.quantidade,
      preco_unitario: selectedProducer.preco,
      total,
      created_by: user?.id,
    });
    if (error) {
      toast.error('Erro ao enviar pedido');
    } else {
      toast.success('Pedido enviado com sucesso!');
      setOrderModalOpen(false);
      setOrderForm({ cliente_nome: '', cliente_contacto: '', quantidade: 1 });
    }
    setSubmitting(false);
  };

  const handleAddProducer = async () => {
    if (!companyId) return;
    const { nome_granja, latitude, longitude, tipo_produto, quantidade_disponivel, preco, telefone } = addForm;
    if (!nome_granja.trim() || !latitude || !longitude || !preco) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('agro_producers').insert({
      company_id: companyId,
      nome_granja: nome_granja.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      tipo_produto,
      quantidade_disponivel: parseInt(quantidade_disponivel) || 0,
      preco: parseFloat(preco),
      telefone: telefone.trim() || null,
    });
    if (error) {
      toast.error('Erro ao adicionar produtor');
    } else {
      toast.success('Produtor adicionado!');
      setAddModalOpen(false);
      setAddForm({ nome_granja: '', latitude: '', longitude: '', tipo_produto: 'frango', quantidade_disponivel: '', preco: '', telefone: '' });
    }
    setSubmitting(false);
  };

  const handleSelectProducer = (p: Producer) => {
    setSelectedProducer(p);
    setOrderModalOpen(true);
  };

  const defaultCenter: [number, number] = userPosition || [-15.12, 39.26];

  if (authLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (fetchError && producers.length === 0) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Erro ao carregar AGRO MAP</h2>
        <p className="text-sm text-muted-foreground mb-4">{fetchError}</p>
        <Button onClick={() => { setFetchError(null); fetchProducers(); }}>Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 relative z-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            AGRO MAP
          </h1>
          <p className="text-sm text-muted-foreground">Marketplace de produtores avícolas</p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Adicionar Produtor
        </Button>
      </div>

      {/* Filters */}
      <Card className="relative z-10">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar granja..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="frango">Frango</SelectItem>
                <SelectItem value="ovos">Ovos</SelectItem>
                <SelectItem value="galinha">Galinha</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Preço máx."
              value={filterMaxPrice}
              onChange={(e) => setFilterMaxPrice(e.target.value)}
              className="w-full sm:w-[130px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Map + List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden border border-border relative z-0" style={{ height: '500px' }}>
          {loading ? (
            <div className="h-full flex items-center justify-center bg-muted">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <React.Suspense fallback={
              <div className="h-full flex items-center justify-center bg-muted">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            }>
              <AgroMap
                producers={filteredProducers}
                center={defaultCenter}
                userPosition={userPosition}
                onSelectProducer={handleSelectProducer}
              />
            </React.Suspense>
          )}
        </div>

        {/* Producer List */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 relative z-10">
          {filteredProducers.length === 0 && !loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Egg className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum produtor encontrado</p>
              </CardContent>
            </Card>
          ) : (
            filteredProducers.map((p) => (
              <Card
                key={p.id}
                className="cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => handleSelectProducer(p)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate text-foreground">{p.nome_granja}</h3>
                      <Badge variant="secondary" className="mt-1 capitalize text-xs">{p.tipo_produto}</Badge>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary text-sm">{p.preco.toFixed(2)} MT</p>
                      <p className="text-xs text-muted-foreground">{p.quantidade_disponivel} disp.</p>
                    </div>
                  </div>
                  {p.telefone && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {p.telefone}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Order Modal */}
      <Dialog open={orderModalOpen} onOpenChange={setOrderModalOpen}>
        <DialogContent className="sm:max-w-md z-[1200]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Fazer Pedido
            </DialogTitle>
          </DialogHeader>
          {selectedProducer && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-3">
                <p className="font-semibold text-foreground">{selectedProducer.nome_granja}</p>
                <p className="text-sm text-muted-foreground capitalize">{selectedProducer.tipo_produto} — {selectedProducer.preco.toFixed(2)} MT/un.</p>
                <p className="text-xs text-muted-foreground">Disponível: {selectedProducer.quantidade_disponivel}</p>
              </div>
              <Input
                placeholder="Seu nome"
                value={orderForm.cliente_nome}
                onChange={(e) => setOrderForm(f => ({ ...f, cliente_nome: e.target.value }))}
              />
              <Input
                placeholder="Seu contacto (telefone)"
                value={orderForm.cliente_contacto}
                onChange={(e) => setOrderForm(f => ({ ...f, cliente_contacto: e.target.value }))}
              />
              <Input
                type="number"
                placeholder="Quantidade"
                min={1}
                max={selectedProducer.quantidade_disponivel}
                value={orderForm.quantidade}
                onChange={(e) => setOrderForm(f => ({ ...f, quantidade: parseInt(e.target.value) || 1 }))}
              />
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <p className="text-sm text-muted-foreground">Total estimado</p>
                <p className="text-2xl font-bold text-primary">
                  {(orderForm.quantidade * selectedProducer.preco).toFixed(2)} MT
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleOrder} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Producer Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md z-[1200]">
          <DialogHeader>
            <DialogTitle>Adicionar Produtor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome da granja *" value={addForm.nome_granja} onChange={(e) => setAddForm(f => ({ ...f, nome_granja: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" step="any" placeholder="Latitude *" value={addForm.latitude} onChange={(e) => setAddForm(f => ({ ...f, latitude: e.target.value }))} />
              <Input type="number" step="any" placeholder="Longitude *" value={addForm.longitude} onChange={(e) => setAddForm(f => ({ ...f, longitude: e.target.value }))} />
            </div>
            <Select value={addForm.tipo_produto} onValueChange={(v) => setAddForm(f => ({ ...f, tipo_produto: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="frango">Frango</SelectItem>
                <SelectItem value="ovos">Ovos</SelectItem>
                <SelectItem value="galinha">Galinha</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Quantidade disponível" value={addForm.quantidade_disponivel} onChange={(e) => setAddForm(f => ({ ...f, quantidade_disponivel: e.target.value }))} />
            <Input type="number" step="0.01" placeholder="Preço por unidade (MT) *" value={addForm.preco} onChange={(e) => setAddForm(f => ({ ...f, preco: e.target.value }))} />
            <Input placeholder="Telefone" value={addForm.telefone} onChange={(e) => setAddForm(f => ({ ...f, telefone: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddProducer} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgroMapPage;
