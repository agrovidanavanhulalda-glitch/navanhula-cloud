import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import {
  Trophy, Medal, Star, Crown, TrendingUp, Target, Zap, Award,
  ChevronUp, ChevronDown, Minus, Flame,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

/* ── Types ─────────────────────────────────────── */

interface SellerScore {
  userId: string;
  name: string;
  totalSales: number;
  salesCount: number;
  avgTicket: number;
  totalCommission: number;
  score: number;
  level: 'bronze' | 'silver' | 'gold' | 'elite';
  badges: string[];
  previousPosition?: number;
}

/* ── Constants ─────────────────────────────────── */

const LEVEL_CONFIG = {
  elite:  { label: 'Elite',  icon: Crown,  color: 'bg-amber-500 text-white',  border: 'border-amber-400', threshold: 500000 },
  gold:   { label: 'Ouro',   icon: Trophy,  color: 'bg-yellow-500 text-white', border: 'border-yellow-400', threshold: 200000 },
  silver: { label: 'Prata',  icon: Medal,   color: 'bg-slate-400 text-white',  border: 'border-slate-300', threshold: 50000 },
  bronze: { label: 'Bronze', icon: Star,    color: 'bg-orange-700 text-white', border: 'border-orange-600', threshold: 0 },
};

const BADGE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  top_seller:       { label: 'Top Vendedor',   icon: Crown,  color: 'bg-amber-100 text-amber-800 border-amber-300' },
  goal_achieved:    { label: 'Meta Batida',    icon: Target, color: 'bg-green-100 text-green-800 border-green-300' },
  highest_commission: { label: 'Maior Comissão', icon: Zap,   color: 'bg-purple-100 text-purple-800 border-purple-300' },
  on_fire:          { label: 'Em Chamas',      icon: Flame,  color: 'bg-red-100 text-red-800 border-red-300' },
};

const CHART_COLORS = [
  'hsl(45, 93%, 47%)',
  'hsl(210, 11%, 71%)',
  'hsl(25, 75%, 47%)',
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(220, 70%, 55%)',
];

/* ── Helpers ─────────────────────────────────── */

function getLevel(totalSales: number): SellerScore['level'] {
  if (totalSales >= LEVEL_CONFIG.elite.threshold) return 'elite';
  if (totalSales >= LEVEL_CONFIG.gold.threshold) return 'gold';
  if (totalSales >= LEVEL_CONFIG.silver.threshold) return 'silver';
  return 'bronze';
}

function computeScore(totalSales: number, salesCount: number, _goalPct: number): number {
  const normalizedSales = Math.min(totalSales / 100000, 10);
  const normalizedCount = Math.min(salesCount / 100, 10);
  const normalizedGoal = Math.min(_goalPct / 100, 10);
  return +(normalizedSales * 0.5 + normalizedCount * 0.2 + normalizedGoal * 0.3).toFixed(2);
}

/* ── Component ─────────────────────────────────── */

const SellerRanking: React.FC = () => {
  const { company } = useAuth();
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<SellerScore[]>([]);

  const getPeriodStart = useCallback(() => {
    const now = new Date();
    if (period === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString(); }
    if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    if (period === 'quarter') return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString();
    return new Date(now.getFullYear(), 0, 1).toISOString();
  }, [period]);

  const loadData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data: stores } = await supabase.from('stores').select('id').eq('company_id', company.id);
    const storeIds = (stores || []).map(s => s.id);
    if (storeIds.length === 0) { setSellers([]); setLoading(false); return; }

    const periodStart = getPeriodStart();

    const [salesRes, commRes] = await Promise.all([
      supabase.from('sales').select('user_id, total, seller_name')
        .in('store_id', storeIds).eq('status', 'completed').gte('created_at', periodStart),
      supabase.from('commissions').select('user_id, amount')
        .in('store_id', storeIds).gte('created_at', periodStart),
    ]);

    const salesData = salesRes.data || [];
    const commData = commRes.data || [];

    // Aggregate by user
    const map = new Map<string, { name: string; totalSales: number; salesCount: number; totalComm: number }>();
    salesData.forEach(s => {
      const key = s.user_id;
      const existing = map.get(key) || { name: s.seller_name || 'Vendedor', totalSales: 0, salesCount: 0, totalComm: 0 };
      existing.totalSales += s.total;
      existing.salesCount += 1;
      if (s.seller_name) existing.name = s.seller_name;
      map.set(key, existing);
    });
    commData.forEach(c => {
      const existing = map.get(c.user_id);
      if (existing) existing.totalComm += c.amount;
    });

    // Build scores
    const maxSales = Math.max(...Array.from(map.values()).map(v => v.totalSales), 1);
    const ranked: SellerScore[] = Array.from(map.entries()).map(([userId, v]) => {
      const goalPct = (v.totalSales / maxSales) * 100;
      const score = computeScore(v.totalSales, v.salesCount, goalPct);
      const level = getLevel(v.totalSales);
      const badges: string[] = [];
      return {
        userId, name: v.name, totalSales: v.totalSales, salesCount: v.salesCount,
        avgTicket: v.salesCount > 0 ? v.totalSales / v.salesCount : 0,
        totalCommission: v.totalComm, score, level, badges,
      };
    }).sort((a, b) => b.score - a.score);

    // Assign badges
    if (ranked.length > 0) {
      ranked[0].badges.push('top_seller');
      const maxComm = Math.max(...ranked.map(r => r.totalCommission));
      ranked.filter(r => r.totalCommission === maxComm && maxComm > 0).forEach(r => r.badges.push('highest_commission'));
      ranked.filter(r => r.salesCount >= 20).forEach(r => r.badges.push('on_fire'));
    }

    setSellers(ranked);
    setLoading(false);
  }, [company?.id, getPeriodStart]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime
  useEffect(() => {
    if (!company?.id) return;
    const channel = supabase
      .channel('ranking-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, () => loadData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'commissions' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [company?.id, loadData]);

  const chartData = useMemo(() => sellers.slice(0, 6).map(s => ({
    name: s.name.split(' ')[0],
    score: s.score,
    vendas: s.totalSales,
  })), [sellers]);

  const periodLabels: Record<string, string> = {
    week: 'Última Semana', month: 'Este Mês', quarter: 'Trimestre', year: 'Este Ano',
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Calculando ranking...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold">Ranking de Vendedores</h2>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Última Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
            <SelectItem value="quarter">Trimestre</SelectItem>
            <SelectItem value="year">Este Ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sellers.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Sem vendas no período seleccionado</CardContent></Card>
      ) : (
        <>
          {/* Podium - Top 3 */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 0, 2].map(idx => {
              const s = sellers[idx];
              if (!s) return <div key={idx} />;
              const pos = idx === 1 ? 2 : idx === 0 ? 1 : 3;
              const cfg = LEVEL_CONFIG[s.level];
              const LevelIcon = cfg.icon;
              const isFirst = pos === 1;
              return (
                <Card key={s.userId} className={`relative overflow-hidden transition-all hover:shadow-lg ${isFirst ? 'ring-2 ring-amber-400 shadow-amber-100' : ''} ${idx === 0 ? 'order-first sm:order-none -mt-0 sm:-mt-4' : ''}`}>
                  <CardContent className="p-4 text-center">
                    {isFirst && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />
                    )}
                    <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mb-2 ${pos === 1 ? 'bg-amber-500 text-white' : pos === 2 ? 'bg-slate-400 text-white' : 'bg-orange-700 text-white'}`}>
                      {pos}
                    </div>
                    <p className="font-bold text-foreground truncate">{s.name}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <LevelIcon className="w-3 h-3" />
                      <span className="text-xs text-muted-foreground">{cfg.label}</span>
                    </div>
                    <p className="text-xl font-bold mt-2 text-foreground">{formatCurrency(s.totalSales)}</p>
                    <p className="text-xs text-muted-foreground">{s.salesCount} vendas · Score {s.score}</p>
                    {s.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center mt-2">
                        {s.badges.map(b => {
                          const bc = BADGE_CONFIG[b];
                          if (!bc) return null;
                          const BIcon = bc.icon;
                          return (
                            <span key={b} className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${bc.color}`}>
                              <BIcon className="w-2.5 h-2.5" /> {bc.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Score Chart */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Score — {periodLabels[period]}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" fontSize={12} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis fontSize={12} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }} />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={32}>
                        {chartData.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Full Leaderboard */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Leaderboard Completo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 max-h-[320px] overflow-y-auto">
                {sellers.slice(0, 10).map((s, i) => {
                  const cfg = LEVEL_CONFIG[s.level];
                  const LevelIcon = cfg.icon;
                  return (
                    <div key={s.userId} className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${i < 3 ? 'bg-primary/5 hover:bg-primary/10' : 'bg-muted/30 hover:bg-muted/50'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-orange-700 text-white' : 'bg-muted text-muted-foreground'}`}>
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold truncate">{s.name}</p>
                            <LevelIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-[11px] text-muted-foreground">{s.salesCount} vendas · {formatCurrency(s.avgTicket)} ticket</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">{s.score}</p>
                        <p className="text-[10px] text-muted-foreground">{formatCurrency(s.totalSales)}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Level Legend */}
          <div className="flex flex-wrap gap-3 justify-center">
            {(Object.entries(LEVEL_CONFIG) as [string, typeof LEVEL_CONFIG.elite][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <div key={key} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${cfg.border} ${cfg.color}`}>
                  <Icon className="w-3 h-3" /> {cfg.label} — {formatCurrency(cfg.threshold)}+
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default SellerRanking;
