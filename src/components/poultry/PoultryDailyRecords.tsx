import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ClipboardList, Plus, Skull, Weight, Wheat, Thermometer } from 'lucide-react';

export interface DailyRecord {
  id: string;
  batch_id: string;
  record_date: string;
  mortality_count: number;
  avg_weight_kg: number | null;
  feed_consumed_kg: number;
  water_consumed_liters: number;
  temperature_celsius: number | null;
  humidity_percent: number | null;
  observations: string | null;
  created_at: string;
}

interface Props {
  records: DailyRecord[];
  batches: { id: string; batch_name: string; status: string; initial_quantity: number; current_quantity: number; mortality: number }[];
  companyId: string;
  onRefresh: () => void;
}

const PoultryDailyRecords: React.FC<Props> = ({ records, batches, companyId, onRefresh }) => {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    batch_id: '', record_date: new Date().toISOString().split('T')[0],
    mortality_count: '', avg_weight_kg: '', feed_consumed_kg: '',
    water_consumed_liters: '', temperature_celsius: '', humidity_percent: '', observations: '',
  });

  const handleCreate = async () => {
    if (!form.batch_id) { toast.error('Selecione o lote'); return; }
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await supabase.from('poultry_daily_records').insert({
      batch_id: form.batch_id, company_id: companyId,
      record_date: form.record_date,
      mortality_count: Number(form.mortality_count) || 0,
      avg_weight_kg: form.avg_weight_kg ? Number(form.avg_weight_kg) : null,
      feed_consumed_kg: Number(form.feed_consumed_kg) || 0,
      water_consumed_liters: Number(form.water_consumed_liters) || 0,
      temperature_celsius: form.temperature_celsius ? Number(form.temperature_celsius) : null,
      humidity_percent: form.humidity_percent ? Number(form.humidity_percent) : null,
      observations: form.observations || null,
      created_by: userId,
    } as any);
    if (error) {
      if (error.code === '23505') toast.error('Já existe registo para este lote nesta data');
      else { toast.error('Erro ao registar'); console.error(error); }
      return;
    }
    toast.success('Registo diário criado! Mortalidade e peso atualizados automaticamente.');
    setShowNew(false);
    setForm({ batch_id: '', record_date: new Date().toISOString().split('T')[0], mortality_count: '', avg_weight_kg: '', feed_consumed_kg: '', water_consumed_liters: '', temperature_celsius: '', humidity_percent: '', observations: '' });
    onRefresh();
  };

  // Calculate FCR per batch
  const calcFCR = (batchId: string) => {
    const batchRecords = records.filter(r => r.batch_id === batchId);
    const batch = batches.find(b => b.id === batchId);
    if (!batch || !batch.avg_weight) return null;
    const totalFeed = batchRecords.reduce((s, r) => s + (r.feed_consumed_kg || 0), 0);
    const totalWeightGain = (batch.current_quantity * (batch.avg_weight || 0)) / 1000; // assuming weight in kg
    if (totalWeightGain <= 0) return null;
    return (totalFeed / totalWeightGain).toFixed(2);
  };

  const activeBatches = batches.filter(b => b.status === 'active');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="w-5 h-5" /> Registos Diários & FCR
        </h3>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Registo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Registo Diário</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Lote</Label>
                  <Select value={form.batch_id} onValueChange={v => setForm(p => ({ ...p, batch_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{activeBatches.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.batch_name}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data</Label><Input type="date" value={form.record_date} onChange={e => setForm(p => ({ ...p, record_date: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="flex items-center gap-1"><Skull className="w-3 h-3" /> Mortes</Label><Input type="number" value={form.mortality_count} onChange={e => setForm(p => ({ ...p, mortality_count: e.target.value }))} placeholder="0" /></div>
                <div><Label className="flex items-center gap-1"><Weight className="w-3 h-3" /> Peso Médio (kg)</Label><Input type="number" step="0.01" value={form.avg_weight_kg} onChange={e => setForm(p => ({ ...p, avg_weight_kg: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="flex items-center gap-1"><Wheat className="w-3 h-3" /> Ração Consumida (kg)</Label><Input type="number" value={form.feed_consumed_kg} onChange={e => setForm(p => ({ ...p, feed_consumed_kg: e.target.value }))} /></div>
                <div><Label>Água (litros)</Label><Input type="number" value={form.water_consumed_liters} onChange={e => setForm(p => ({ ...p, water_consumed_liters: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> Temperatura (°C)</Label><Input type="number" value={form.temperature_celsius} onChange={e => setForm(p => ({ ...p, temperature_celsius: e.target.value }))} /></div>
                <div><Label>Humidade (%)</Label><Input type="number" value={form.humidity_percent} onChange={e => setForm(p => ({ ...p, humidity_percent: e.target.value }))} /></div>
              </div>
              <div><Label>Observações</Label><Input value={form.observations} onChange={e => setForm(p => ({ ...p, observations: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate}>Registar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* FCR Cards */}
      {activeBatches.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {activeBatches.map(b => {
            const fcr = calcFCR(b.id);
            const batchRecords = records.filter(r => r.batch_id === b.id);
            const totalFeed = batchRecords.reduce((s, r) => s + (r.feed_consumed_kg || 0), 0);
            const mortalityRate = b.initial_quantity > 0 ? ((b.mortality || 0) / b.initial_quantity * 100).toFixed(1) : '0';
            return (
              <Card key={b.id} className="p-3">
                <p className="text-xs text-muted-foreground font-medium">{b.batch_name}</p>
                <div className="mt-1 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">FCR:</span>
                    <span className={`font-bold ${fcr && Number(fcr) < 2 ? 'text-green-600' : fcr && Number(fcr) > 2.5 ? 'text-destructive' : ''}`}>
                      {fcr || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ração Total:</span>
                    <span className="font-medium">{totalFeed.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mortalidade:</span>
                    <span className={`font-medium ${Number(mortalityRate) > 5 ? 'text-destructive' : ''}`}>{mortalityRate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Peso Médio:</span>
                    <span className="font-medium">{b.avg_weight ? `${b.avg_weight} kg` : '—'}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Records list */}
      {records.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhum registo diário.</Card>
      ) : (
        <div className="space-y-2">
          {records.slice(0, 30).map(r => {
            const batch = batches.find(b => b.id === r.batch_id);
            return (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium text-sm">{batch?.batch_name || '—'} — {new Date(r.record_date).toLocaleDateString('pt-MZ')}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    {r.mortality_count > 0 && <span className="text-destructive">☠ {r.mortality_count} mortes</span>}
                    {r.avg_weight_kg && <span>⚖ {r.avg_weight_kg} kg</span>}
                    {r.feed_consumed_kg > 0 && <span>🌾 {r.feed_consumed_kg} kg ração</span>}
                    {r.temperature_celsius && <span>🌡 {r.temperature_celsius}°C</span>}
                  </div>
                </div>
                {r.observations && <p className="text-xs text-muted-foreground max-w-[200px] truncate">{r.observations}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PoultryDailyRecords;
