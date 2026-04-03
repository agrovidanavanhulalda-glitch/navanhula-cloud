import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Bird, MapPin, TrendingUp, AlertTriangle, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--primary))', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

interface Props {
  criadores: any[];
}

const CriadoresDashboard: React.FC<Props> = ({ criadores }) => {
  const stats = useMemo(() => {
    const total = criadores.length;
    const totalCapacidade = criadores.reduce((s, c) => s + (c.capacidade || 0), 0);
    const precoMedio = criadores.length > 0
      ? criadores.reduce((s, c) => s + (c.preco_medio || 0), 0) / criadores.filter(c => c.preco_medio > 0).length || 0
      : 0;

    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86400000);
    const in15 = new Date(now.getTime() + 15 * 86400000);
    const in30 = new Date(now.getTime() + 30 * 86400000);

    const prevista7 = criadores.filter(c => c.data_prevista_venda && new Date(c.data_prevista_venda) <= in7).reduce((s, c) => s + (c.capacidade || 0), 0);
    const prevista15 = criadores.filter(c => c.data_prevista_venda && new Date(c.data_prevista_venda) <= in15).reduce((s, c) => s + (c.capacidade || 0), 0);
    const prevista30 = criadores.filter(c => c.data_prevista_venda && new Date(c.data_prevista_venda) <= in30).reduce((s, c) => s + (c.capacidade || 0), 0);

    const porProvincia: Record<string, number> = {};
    criadores.forEach(c => {
      const p = c.provincia || 'Sem Província';
      porProvincia[p] = (porProvincia[p] || 0) + 1;
    });
    const provData = Object.entries(porProvincia).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const capPorProvincia: Record<string, number> = {};
    criadores.forEach(c => {
      const p = c.provincia || 'Sem Província';
      capPorProvincia[p] = (capPorProvincia[p] || 0) + (c.capacidade || 0);
    });
    const capData = Object.entries(capPorProvincia).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const semMercado = criadores.filter(c => !c.tem_mercado);
    const topCriadores = [...criadores].sort((a, b) => (b.capacidade || 0) - (a.capacidade || 0)).slice(0, 5);
    const proxVenda = criadores.filter(c => c.data_prevista_venda && new Date(c.data_prevista_venda) <= in7 && new Date(c.data_prevista_venda) >= now);

    return { total, totalCapacidade, precoMedio, prevista7, prevista15, prevista30, provData, capData, semMercado, topCriadores, proxVenda };
  }, [criadores]);

  const kpis = [
    { label: 'Total Criadores', value: stats.total, icon: Users, color: 'text-primary' },
    { label: 'Capacidade Total', value: stats.totalCapacidade.toLocaleString() + ' aves', icon: Bird, color: 'text-emerald-500' },
    { label: 'Produção 7 dias', value: stats.prevista7.toLocaleString() + ' aves', icon: TrendingUp, color: 'text-amber-500' },
    { label: 'Preço Médio', value: stats.precoMedio > 0 ? stats.precoMedio.toFixed(0) + ' MT' : '-', icon: Star, color: 'text-violet-500' },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${k.color}`}><Icon className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-lg font-bold text-foreground">{k.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Previsão */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Previsão 7 dias', value: stats.prevista7 },
          { label: 'Previsão 15 dias', value: stats.prevista15 },
          { label: 'Previsão 30 dias', value: stats.prevista30 },
        ].map(p => (
          <Card key={p.label}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{p.label}</p>
              <p className="text-2xl font-bold text-foreground">{p.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">aves</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Capacidade por Província</CardTitle></CardHeader>
          <CardContent>
            {stats.capData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.capData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Distribuição por Província</CardTitle></CardHeader>
          <CardContent>
            {stats.provData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={stats.provData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {stats.provData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top criadores */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" />Top Criadores</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.topCriadores.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0 text-xs">{i + 1}</Badge>
                  <span className="truncate">{c.nome}</span>
                </span>
                <span className="font-medium text-foreground">{c.capacidade?.toLocaleString()}</span>
              </div>
            ))}
            {stats.topCriadores.length === 0 && <p className="text-sm text-muted-foreground">Sem dados</p>}
          </CardContent>
        </Card>

        {/* Sem mercado */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Sem Mercado ({stats.semMercado.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.semMercado.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{c.nome}</span>
                <span className="text-muted-foreground">{c.provincia}</span>
              </div>
            ))}
            {stats.semMercado.length === 0 && <p className="text-sm text-muted-foreground">Todos têm mercado</p>}
          </CardContent>
        </Card>

        {/* Próximas vendas */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-500" />Vendas Próximas (7d)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.proxVenda.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{c.nome}</span>
                <Badge variant="outline">{c.data_prevista_venda}</Badge>
              </div>
            ))}
            {stats.proxVenda.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma venda nos próximos 7 dias</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CriadoresDashboard;
