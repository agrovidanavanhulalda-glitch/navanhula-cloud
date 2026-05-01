import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ShoppingCart, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(220, 60%, 55%)', 'hsl(45, 80%, 55%)'];

const MarketplaceDashboard: React.FC = () => {
  const { company } = useAuth();
  const [stats, setStats] = useState({ buyers: 0, ordersOpen: 0, ordersNegotiating: 0, ordersClosed: 0, totalVolume: 0, conversionRate: 0 });
  const [demandByProvince, setDemandByProvince] = useState<any[]>([]);
  const [buyerTypes, setBuyerTypes] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    if (!company?.id) return;
    const load = async () => {
      // Buyers
      const { count: buyerCount } = await supabase.from('compradores').select('*', { count: 'exact', head: true })
        .eq('company_id', company.id).eq('status', 'ativo');

      // Orders
      const { data: orders } = await supabase.from('pedidos_marketplace').select('status, quantidade, preco_oferecido')
        .eq('company_id', company.id) as any;

      const open = orders?.filter((o: any) => o.status === 'aberto').length || 0;
      const nego = orders?.filter((o: any) => o.status === 'em negociação').length || 0;
      const closed = orders?.filter((o: any) => o.status === 'fechado').length || 0;
      const total = orders?.length || 1;
      const volume = orders?.reduce((s: number, o: any) => s + (o.quantidade || 0) * (o.preco_oferecido || 0), 0) || 0;

      setStats({
        buyers: buyerCount || 0,
        ordersOpen: open,
        ordersNegotiating: nego,
        ordersClosed: closed,
        totalVolume: volume,
        conversionRate: Math.round((closed / total) * 100),
      });

      // Demand by province
      const { data: buyers } = await supabase.from('compradores').select('provincia, capacidade_compra')
        .eq('company_id', company.id).eq('status', 'ativo') as any;
      const provMap: Record<string, number> = {};
      buyers?.forEach((b: any) => {
        const p = b.provincia || 'Outros';
        provMap[p] = (provMap[p] || 0) + (b.capacidade_compra || 0);
      });
      setDemandByProvince(Object.entries(provMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8));

      // Buyer types
      const typeMap: Record<string, number> = {};
      buyers?.forEach((b: any) => { typeMap[b.tipo || 'outros'] = (typeMap[b.tipo || 'outros'] || 0) + 1; });
      setBuyerTypes(Object.entries(typeMap).map(([name, value]) => ({ name, value })));

      // Alerts
      const newAlerts: string[] = [];
      if (open > 5) newAlerts.push(`${open} pedidos aguardam matching`);

      // Check supply vs demand
      const { data: criadores } = await supabase.from('criadores').select('capacidade')
        .eq('company_id', company.id).eq('status', 'ativo') as any;
      const totalSupply = criadores?.reduce((s: number, c: any) => s + (c.capacidade || 0), 0) || 0;
      const totalDemand = buyers?.reduce((s: number, b: any) => s + (b.capacidade_compra || 0), 0) || 0;
      if (totalDemand > totalSupply * 1.2) {
        newAlerts.push(`Demanda (${totalDemand}) supera oferta (${totalSupply}) em ${Math.round(((totalDemand - totalSupply) / totalSupply) * 100)}%`);
      }
      setAlerts(newAlerts);
    };
    load();
  }, [company?.id]);

  const kpis = [
    { label: 'Compradores Ativos', value: stats.buyers, icon: Users, color: 'text-blue-600' },
    { label: 'Pedidos Abertos', value: stats.ordersOpen, icon: ShoppingCart, color: 'text-yellow-600' },
    { label: 'Em Negociação', value: stats.ordersNegotiating, icon: TrendingUp, color: 'text-orange-600' },
    { label: 'Taxa Conversão', value: `${stats.conversionRate}%`, icon: CheckCircle, color: 'text-green-600' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <k.icon className={`h-8 w-8 ${k.color}`} />
              <div>
                <p className="text-2xl font-bold">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {alerts.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4 space-y-1">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                <span>{a}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Demanda por Província</CardTitle></CardHeader>
          <CardContent>
            {demandByProvince.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={demandByProvince}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Tipos de Compradores</CardTitle></CardHeader>
          <CardContent>
            {buyerTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={buyerTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {buyerTypes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MarketplaceDashboard;
