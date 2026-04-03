import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, MapPin, Phone, ShoppingCart, Plus, Filter, Egg, Search } from 'lucide-react';
import { z } from 'zod';

// Fix leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const productIcon = (tipo: string) => {
  const color = tipo === 'frango' ? '#ef4444' : tipo === 'ovos' ? '#f59e0b' : '#22c55e';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

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

function LocationUpdater({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 13);
  }, [position, map]);
  return null;
}

const AgroMapPage: React.FC = () => {
  const { user, companyId } = useAuth();
  const [producers, setProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [selectedProducer, setSelectedProducer] = useState<Producer | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');

  // Order form
  const [orderForm, setOrderForm] = useState({ cliente_nome: '', cliente_contacto: '', quantidade: 1 });

  // Add producer form
  const [addForm, setAddForm] = useState({
    nome_granja: '', latitude: '', longitude: '', tipo_produto: 'frango',
    quantidade_disponivel: '', preco: '', telefone: '',
  });

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setUserPosition([-15.12, 39.26]) // Nampula default
    );
    fetchProducers();

    const channel = supabase
      .channel('agro-producers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agro_producers' }, () => fetchProducers())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchProducers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agro_producers')
      .select('*')
      .eq('status', 'ativo')
      .order('created_at', { ascending: false });
    if (!error && data) setProducers(data);
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

  const defaultCenter: [number, number] = userPosition || [-15.12, 39.26];

  return (
    <div className="p-4 md:p-6 space-y-4">
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
      <Card>
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
        <div className="lg:col-span-2 rounded-xl overflow-hidden border border-border" style={{ height: '500px' }}>
          {loading ? (
            <div className="h-full flex items-center justify-center bg-muted">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <MapContainer center={defaultCenter} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationUpdater position={userPosition} />
              {filteredProducers.map((p) => (
                <Marker key={p.id} position={[p.latitude, p.longitude]} icon={productIcon(p.tipo_produto)}>
                  <Popup>
                    <div className="min-w-[200px]">
                      <h3 className="font-bold text-sm">{p.nome_granja}</h3>
                      <p className="text-xs text-gray-500 capitalize">{p.tipo_produto}</p>
                      <p className="text-sm font-semibold mt-1">{p.preco.toFixed(2)} MT</p>
                      <p className="text-xs">Disponível: {p.quantidade_disponivel}</p>
                      <button
                        className="mt-2 w-full bg-primary text-white text-xs py-1.5 rounded-md font-medium"
                        onClick={() => { setSelectedProducer(p); setOrderModalOpen(true); }}
                      >
                        Fazer Pedido
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Producer List */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
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
                onClick={() => { setSelectedProducer(p); setOrderModalOpen(true); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{p.nome_granja}</h3>
                      <Badge variant="secondary" className="mt-1 capitalize text-xs">{p.tipo_produto}</Badge>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary">{p.preco.toFixed(2)} MT</p>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Fazer Pedido
            </DialogTitle>
          </DialogHeader>
          {selectedProducer && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-3">
                <p className="font-semibold">{selectedProducer.nome_granja}</p>
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
        <DialogContent className="sm:max-w-md">
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
