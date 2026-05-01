import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import {
  Sprout, Plus, TrendingUp, AlertTriangle, Leaf, Package,
  BarChart3, RefreshCw, Calendar, DollarSign
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface Crop {
  id: string;
  company_id: string;
  store_id: string | null;
  name: string;
  area_planted: number;
  planting_date: string;
  expected_harvest_date: string | null;
  total_cost: number;
  quantity_harvested: number;
  losses: number;
  expected_profit: number;
  status: string;
  created_at: string;
}

interface AgroInput {
  id: string;
  crop_id: string;
  input_type: string;
  name: string;
  quantity: number;
  cost: number;
  usage_date: string;
}

const CHART_COLORS = ['hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(0, 84%, 60%)', 'hsl(280, 67%, 55%)'];

const statusLabels: Record<string, string> = {
  planted: 'Plantado',
  growing: 'Crescimento',
  harvested: 'Colhido',
  lost: 'Perdido',
};

const statusColors: Record<string, string> = {
  planted: 'bg-blue-100 text-blue-800',
  growing: 'bg-green-100 text-green-800',
  harvested: 'bg-amber-100 text-amber-800',
  lost: 'bg-red-100 text-red-800',
};

const AgriculturePage: React.FC = () => {
  const { company, store } = useAuth();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [inputs, setInputs] = useState<AgroInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCrop, setShowNewCrop] = useState(false);
  const [showNewInput, setShowNewInput] = useState(false);
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);

  // New crop form
  const [newCrop, setNewCrop] = useState({
    name: '', area_planted: '', planting_date: new Date().toISOString().split('T')[0],
    expected_harvest_date: '', total_cost: '', expected_profit: '',
  });

  // New input form
  const [newInput, setNewInput] = useState({
    crop_id: '', input_type: 'fertilizer', name: '', quantity: '', cost: '',
    usage_date: new Date().toISOString().split('T')[0],
  });

  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const [cropsRes, inputsRes] = await Promise.all([
        supabase.from('crops').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
        supabase.from('agro_inputs').select('*').order('created_at', { ascending: false }),
      ]);
      if (cropsRes.data) setCrops(cropsRes.data as unknown as Crop[]);
      if (inputsRes.data) setInputs(inputsRes.data as unknown as AgroInput[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateCrop = async () => {
    if (!newCrop.name || !newCrop.area_planted) {
      toast.error('Preencha nome e área plantada');
      return;
    }
    const { error } = await supabase.from('crops').insert({
      company_id: company?.id,
      store_id: store?.id,
      name: newCrop.name,
      area_planted: Number(newCrop.area_planted),
      planting_date: newCrop.planting_date,
      expected_harvest_date: newCrop.expected_harvest_date || null,
      total_cost: Number(newCrop.total_cost) || 0,
      expected_profit: Number(newCrop.expected_profit) || 0,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    } as any);
    if (error) { toast.error('Erro ao criar cultura'); console.error(error); return; }
    toast.success('Cultura registada com sucesso!');
    setShowNewCrop(false);
    setNewCrop({ name: '', area_planted: '', planting_date: new Date().toISOString().split('T')[0], expected_harvest_date: '', total_cost: '', expected_profit: '' });
    fetchData();
  };

  const handleCreateInput = async () => {
    if (!newInput.crop_id || !newInput.name) {
      toast.error('Selecione a cultura e preencha o nome do insumo');
      return;
    }
    const { error } = await supabase.from('agro_inputs').insert({
      crop_id: newInput.crop_id,
      input_type: newInput.input_type,
      name: newInput.name,
      quantity: Number(newInput.quantity) || 0,
      cost: Number(newInput.cost) || 0,
      usage_date: newInput.usage_date,
    } as any);
    if (error) { toast.error('Erro ao registar insumo'); console.error(error); return; }

    // Update crop total cost
    const inputCost = Number(newInput.cost) || 0;
    if (inputCost > 0) {
      await supabase.from('crops').update({
        total_cost: (crops.find(c => c.id === newInput.crop_id)?.total_cost || 0) + inputCost
      } as any).eq('id', newInput.crop_id);
    }

    toast.success('Insumo registado!');
    setShowNewInput(false);
    setNewInput({ crop_id: '', input_type: 'fertilizer', name: '', quantity: '', cost: '', usage_date: new Date().toISOString().split('T')[0] });
    fetchData();
  };

  const handleHarvest = async (cropId: string) => {
    const qty = prompt('Quantidade colhida (kg/unidades):');
    if (!qty) return;
    const losses = prompt('Perdas (kg/unidades):') || '0';
    const { error } = await supabase.from('crops').update({
      quantity_harvested: Number(qty),
      losses: Number(losses),
      status: 'harvested',
      updated_at: new Date().toISOString(),
    } as any).eq('id', cropId);
    if (error) { toast.error('Erro ao registar colheita'); return; }
    toast.success('Colheita registada!');
    fetchData();
  };

  // KPIs
  const totalCrops = crops.length;
  const activeCrops = crops.filter(c => c.status === 'planted' || c.status === 'growing').length;
  const totalHarvested = crops.reduce((s, c) => s + Number(c.quantity_harvested || 0), 0);
  const totalCost = crops.reduce((s, c) => s + Number(c.total_cost || 0), 0);
  const totalProfit = crops.reduce((s, c) => s + Number(c.expected_profit || 0), 0);
  const totalArea = crops.reduce((s, c) => s + Number(c.area_planted || 0), 0);

  const profitByCrop = crops.filter(c => c.status === 'harvested').map(c => ({
    name: c.name,
    lucro: Number(c.expected_profit) - Number(c.total_cost),
    custo: Number(c.total_cost),
  }));

  const statusDist = Object.entries(
    crops.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: statusLabels[name] || name, value }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Sprout className="w-7 h-7 text-green-600" /> Módulo Agrícola
          </h1>
          <p className="text-muted-foreground">Gestão de culturas, insumos e colheitas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          <Dialog open={showNewInput} onOpenChange={setShowNewInput}>
            <DialogTrigger asChild>
              <Button variant="outline"><Package className="w-4 h-4 mr-2" /> Novo Insumo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registar Insumo Agrícola</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Cultura</Label>
                  <Select value={newInput.crop_id} onValueChange={v => setNewInput(p => ({ ...p, crop_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione a cultura" /></SelectTrigger>
                    <SelectContent>
                      {crops.filter(c => c.status !== 'harvested' && c.status !== 'lost').map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={newInput.input_type} onValueChange={v => setNewInput(p => ({ ...p, input_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fertilizer">Fertilizante</SelectItem>
                      <SelectItem value="seed">Semente</SelectItem>
                      <SelectItem value="pesticide">Pesticida</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Nome</Label><Input value={newInput.name} onChange={e => setNewInput(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Quantidade</Label><Input type="number" value={newInput.quantity} onChange={e => setNewInput(p => ({ ...p, quantity: e.target.value }))} /></div>
                  <div><Label>Custo (MZN)</Label><Input type="number" value={newInput.cost} onChange={e => setNewInput(p => ({ ...p, cost: e.target.value }))} /></div>
                </div>
                <div><Label>Data de Uso</Label><Input type="date" value={newInput.usage_date} onChange={e => setNewInput(p => ({ ...p, usage_date: e.target.value }))} /></div>
                <Button className="w-full" onClick={handleCreateInput}>Registar Insumo</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showNewCrop} onOpenChange={setShowNewCrop}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Nova Cultura</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registar Nova Cultura</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome da Cultura</Label><Input value={newCrop.name} onChange={e => setNewCrop(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Milho, Tomate..." /></div>
                <div><Label>Área Plantada (ha)</Label><Input type="number" value={newCrop.area_planted} onChange={e => setNewCrop(p => ({ ...p, area_planted: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Data Plantio</Label><Input type="date" value={newCrop.planting_date} onChange={e => setNewCrop(p => ({ ...p, planting_date: e.target.value }))} /></div>
                  <div><Label>Previsão Colheita</Label><Input type="date" value={newCrop.expected_harvest_date} onChange={e => setNewCrop(p => ({ ...p, expected_harvest_date: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Custo Total (MZN)</Label><Input type="number" value={newCrop.total_cost} onChange={e => setNewCrop(p => ({ ...p, total_cost: e.target.value }))} /></div>
                  <div><Label>Lucro Previsto (MZN)</Label><Input type="number" value={newCrop.expected_profit} onChange={e => setNewCrop(p => ({ ...p, expected_profit: e.target.value }))} /></div>
                </div>
                <Button className="w-full" onClick={handleCreateCrop}>Registar Cultura</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { icon: Sprout, label: 'Total Culturas', value: totalCrops },
          { icon: Leaf, label: 'Ativas', value: activeCrops, color: 'text-green-600' },
          { icon: BarChart3, label: 'Área Total', value: `${totalArea.toFixed(1)} ha` },
          { icon: Package, label: 'Colhido', value: `${totalHarvested} un` },
          { icon: DollarSign, label: 'Custo Total', value: formatCurrency(totalCost) },
          { icon: TrendingUp, label: 'Lucro Previsto', value: formatCurrency(totalProfit), color: 'text-green-600' },
        ].map((kpi, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><kpi.icon className="w-4 h-4" />{kpi.label}</div>
            <p className={`text-xl font-bold mt-1 ${kpi.color || ''}`}>{kpi.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="crops">
        <TabsList>
          <TabsTrigger value="crops">Culturas</TabsTrigger>
          <TabsTrigger value="inputs">Insumos</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="crops" className="space-y-4 mt-4">
          {crops.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">Nenhuma cultura registada. Clique em "Nova Cultura" para começar.</Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {crops.map(crop => (
                <Card key={crop.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">{crop.name}</h3>
                    <Badge className={statusColors[crop.status] || 'bg-muted'}>{statusLabels[crop.status] || crop.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Área:</span> {crop.area_planted} ha</div>
                    <div><span className="text-muted-foreground">Plantio:</span> {new Date(crop.planting_date).toLocaleDateString('pt-BR')}</div>
                    <div><span className="text-muted-foreground">Custo:</span> {formatCurrency(crop.total_cost)}</div>
                    <div><span className="text-muted-foreground">Colhido:</span> {crop.quantity_harvested || 0}</div>
                  </div>
                  {(crop.status === 'planted' || crop.status === 'growing') && (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => handleHarvest(crop.id)}>
                      <Leaf className="w-4 h-4 mr-2" /> Registar Colheita
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inputs" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Insumos Utilizados</CardTitle></CardHeader>
            <CardContent>
              {inputs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum insumo registado</p>
              ) : (
                <div className="space-y-2">
                  {inputs.map(inp => {
                    const crop = crops.find(c => c.id === inp.crop_id);
                    return (
                      <div key={inp.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium text-sm">{inp.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {crop?.name || '—'} · {inp.input_type === 'fertilizer' ? 'Fertilizante' : inp.input_type === 'seed' ? 'Semente' : inp.input_type === 'pesticide' ? 'Pesticida' : 'Outro'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{formatCurrency(inp.cost)}</p>
                          <p className="text-xs text-muted-foreground">{inp.quantity} un</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Lucro por Cultura</CardTitle></CardHeader>
              <CardContent>
                {profitByCrop.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={profitByCrop}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="lucro" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="Lucro" />
                      <Bar dataKey="custo" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Custo" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados de colheita</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Distribuição por Status</CardTitle></CardHeader>
              <CardContent>
                {statusDist.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={statusDist} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {statusDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgriculturePage;
