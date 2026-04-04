import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';
import {
  Award, DollarSign, CheckCircle, Clock, TrendingUp, Users, Target,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

interface Commission {
  id: string;
  user_id: string;
  amount: number;
  rate: number;
  status: string | null;
  created_at: string | null;
  paid_at: string | null;
  sale_id: string | null;
}

interface Employee {
  id: string;
  full_name: string;
  position: string;
  profile_id: string | null;
  commission_rate: number;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(220, 70%, 55%)',
  'hsl(200, 65%, 50%)',
  'hsl(180, 60%, 45%)',
  'hsl(160, 55%, 40%)',
];

const CommissionsManager: React.FC = () => {
  const { company } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  const getPeriodStart = useCallback(() => {
    const now = new Date();
    if (period === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), q, 1).toISOString();
    }
    return new Date(now.getFullYear(), 0, 1).toISOString();
  }, [period]);

  const loadData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data: stores } = await supabase.from('stores').select('id').eq('company_id', company.id);
    const storeIds = (stores || []).map(s => s.id);

    const [commRes, empRes] = await Promise.all([
      storeIds.length > 0
        ? supabase.from('commissions').select('*')
            .in('store_id', storeIds)
            .gte('created_at', getPeriodStart())
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as Commission[] }),
      supabase.from('employees').select('id, full_name, position, profile_id, commission_rate')
        .eq('company_id', company.id).eq('status', 'active'),
    ]);

    setCommissions((commRes.data || []) as Commission[]);
    setEmployees(empRes.data || []);
    setLoading(false);
  }, [company?.id, getPeriodStart]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime subscription
  useEffect(() => {
    if (!company?.id) return;
    const channel = supabase
      .channel('commissions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commissions' }, () => {
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [company?.id, loadData]);

  const handleMarkPaid = async (id: string) => {
    const { error } = await supabase.from('commissions').update({
      status: 'paid', paid_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) toast.error('Erro ao marcar como paga');
    else { toast.success('Comissão marcada como paga'); loadData(); }
  };

  const handlePayAll = async () => {
    const pendingIds = commissions.filter(c => c.status === 'pending').map(c => c.id);
    if (pendingIds.length === 0) return;
    const { error } = await supabase.from('commissions').update({
      status: 'paid', paid_at: new Date().toISOString(),
    }).in('id', pendingIds);
    if (error) toast.error('Erro ao pagar comissões');
    else { toast.success(`${pendingIds.length} comissões pagas`); loadData(); }
  };

  // Stats
  const stats = useMemo(() => {
    const totalPaid = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0);
    const totalPending = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0);
    return { totalPaid, totalPending, total: totalPaid + totalPending, count: commissions.length };
  }, [commissions]);

  // Ranking by employee
  const ranking = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number; paid: number; pending: number }>();
    commissions.forEach(c => {
      const emp = employees.find(e => e.profile_id === c.user_id);
      const name = emp?.full_name || 'Desconhecido';
      const key = c.user_id;
      const existing = map.get(key) || { name, total: 0, count: 0, paid: 0, pending: 0 };
      existing.total += c.amount;
      existing.count += 1;
      if (c.status === 'paid') existing.paid += c.amount;
      else existing.pending += c.amount;
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [commissions, employees]);

  const periodLabels: Record<string, string> = {
    week: 'Última Semana',
    month: 'Este Mês',
    quarter: 'Este Trimestre',
    year: 'Este Ano',
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando comissões...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" /> Gestão de Comissões
        </h2>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
          {stats.totalPending > 0 && (
            <Button size="sm" onClick={handlePayAll}>
              <CheckCircle className="w-4 h-4 mr-1" /> Pagar Todas
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={DollarSign} label="Total Comissões" value={formatCurrency(stats.total)} />
        <KPI icon={CheckCircle} label="Pagas" value={formatCurrency(stats.totalPaid)} color="text-green-600" />
        <KPI icon={Clock} label="Pendentes" value={formatCurrency(stats.totalPending)} color="text-amber-600" />
        <KPI icon={Target} label="Nº Comissões" value={String(stats.count)} />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Comissões por Vendedor — {periodLabels[period]}</CardTitle>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">Sem comissões no período</p>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ranking.slice(0, 6)} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} fontSize={12} />
                    <YAxis type="category" dataKey="name" width={100} fontSize={12} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }} />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={22}>
                      {ranking.slice(0, 6).map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ranking */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Ranking Vendedores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>
            ) : (
              ranking.slice(0, 8).map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-primary text-primary-foreground' :
                      i === 1 ? 'bg-secondary text-secondary-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.count} comissões</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(r.total)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent commissions table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Comissões Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma comissão registada no período</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Taxa</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.slice(0, 20).map(c => {
                  const emp = employees.find(e => e.profile_id === c.user_id);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{emp?.full_name || 'Desconhecido'}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(c.amount)}</TableCell>
                      <TableCell>{c.rate}%</TableCell>
                      <TableCell className="text-muted-foreground">{c.created_at ? formatDate(c.created_at) : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'paid' ? 'default' : 'secondary'}>
                          {c.status === 'paid' ? 'Paga' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {c.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => handleMarkPaid(c.id)}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Pagar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const KPI: React.FC<{ icon: React.ElementType; label: string; value: string; color?: string }> = ({ icon: Icon, label, value, color }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color || ''}`}>{value}</p>
    </CardContent>
  </Card>
);

export default CommissionsManager;
