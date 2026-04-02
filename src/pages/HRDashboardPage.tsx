import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/formatters';
import { SkeletonKPI, SkeletonChart, SkeletonList } from '@/components/ui/skeleton-card';
import {
  Users, DollarSign, TrendingUp, Award, Clock, AlertTriangle,
  CheckCircle, UserCheck, BarChart3, Zap,
} from 'lucide-react';
import AttendanceManager from '@/components/hr/AttendanceManager';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

interface Employee {
  id: string;
  full_name: string;
  position: string;
  department: string;
  base_salary: number;
  status: string;
  hire_date: string;
}

interface Commission {
  id: string;
  user_id: string;
  amount: number;
  rate: number;
  status: string | null;
  created_at: string | null;
}

interface Sale {
  id: string;
  user_id: string;
  total: number;
  profit: number;
  seller_name: string | null;
  created_at: string | null;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(220, 70%, 55%)',
  'hsl(200, 65%, 50%)',
  'hsl(180, 60%, 45%)',
  'hsl(160, 55%, 40%)',
  'hsl(140, 50%, 45%)',
  'hsl(260, 60%, 55%)',
];

const HRDashboardPage: React.FC = () => {
  const { company } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    loadData();
  }, [company?.id]);

  const loadData = async () => {
    setLoading(true);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [empRes, commRes, salesRes] = await Promise.all([
      supabase.from('employees').select('id, full_name, position, department, base_salary, status, hire_date')
        .eq('company_id', company!.id),
      supabase.from('commissions').select('id, user_id, amount, rate, status, created_at')
        .gte('created_at', startOfMonth),
      supabase.from('sales').select('id, user_id, total, profit, seller_name, created_at')
        .eq('store_id', company!.id)
        .gte('created_at', startOfMonth),
    ]);

    setEmployees(empRes.data || []);
    setCommissions(commRes.data || []);
    setSales(salesRes.data || []);
    setLoading(false);
  };

  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'active'), [employees]);

  const kpis = useMemo(() => {
    const totalSalaryCost = activeEmployees.reduce((s, e) => s + e.base_salary, 0);
    const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
    const totalProfit = sales.reduce((s, sale) => s + sale.profit, 0);
    const profitPerEmployee = activeEmployees.length > 0 ? totalProfit / activeEmployees.length : 0;
    return { totalSalaryCost, totalRevenue, totalProfit, profitPerEmployee, activeCount: activeEmployees.length };
  }, [activeEmployees, sales]);

  const revenueByEmployee = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; profit: number; sales: number }>();
    sales.forEach(sale => {
      const name = sale.seller_name || 'Sem nome';
      const existing = map.get(name) || { name, revenue: 0, profit: 0, sales: 0 };
      existing.revenue += sale.total;
      existing.profit += sale.profit;
      existing.sales += 1;
      map.set(name, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  const commissionStats = useMemo(() => {
    const totalPaid = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0);
    const totalPending = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0);
    return { totalPaid, totalPending, total: totalPaid + totalPending };
  }, [commissions]);

  const insights = useMemo(() => {
    const msgs: { icon: React.ReactNode; text: string; type: 'success' | 'warning' | 'info' }[] = [];

    if (revenueByEmployee.length > 0) {
      const top = revenueByEmployee[0];
      msgs.push({
        icon: <Award className="w-4 h-4" />,
        text: `${top.name} lidera com ${formatCurrency(top.revenue)} em vendas este mês.`,
        type: 'success',
      });
    }

    if (kpis.profitPerEmployee > 0) {
      msgs.push({
        icon: <TrendingUp className="w-4 h-4" />,
        text: `Lucro médio por funcionário: ${formatCurrency(kpis.profitPerEmployee)}.`,
        type: 'info',
      });
    }

    if (commissionStats.totalPending > 0) {
      msgs.push({
        icon: <AlertTriangle className="w-4 h-4" />,
        text: `${formatCurrency(commissionStats.totalPending)} em comissões pendentes de pagamento.`,
        type: 'warning',
      });
    }

    const inactiveCount = employees.filter(e => e.status !== 'active').length;
    if (inactiveCount > 0) {
      msgs.push({
        icon: <Users className="w-4 h-4" />,
        text: `${inactiveCount} funcionário(s) inativo(s) no sistema.`,
        type: 'warning',
      });
    }

    return msgs;
  }, [revenueByEmployee, kpis, commissionStats, employees]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonKPI key={i} />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonList rows={5} />
        </div>
      </div>
    );
  }

  const insightColor = { success: 'text-green-600 bg-green-50 border-green-200', warning: 'text-amber-600 bg-amber-50 border-amber-200', info: 'text-blue-600 bg-blue-50 border-blue-200' };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recursos Humanos</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral da equipa e desempenho</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={<DollarSign />} label="Custo Salarial Mensal" value={formatCurrency(kpis.totalSalaryCost)} />
        <KPICard icon={<TrendingUp />} label="Receita da Equipa" value={formatCurrency(kpis.totalRevenue)} />
        <KPICard icon={<BarChart3 />} label="Lucro / Funcionário" value={formatCurrency(kpis.profitPerEmployee)} />
        <KPICard icon={<UserCheck />} label="Funcionários Activos" value={String(kpis.activeCount)} />
      </div>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {insights.map((insight, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${insightColor[insight.type]}`}>
              <span className="mt-0.5 shrink-0">{insight.icon}</span>
              <span className="text-sm font-medium">{insight.text}</span>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="commissions">Comissões</TabsTrigger>
          <TabsTrigger value="team">Equipa</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Chart */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Receita por Colaborador</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueByEmployee.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-12 text-center">Sem dados de vendas este mês</p>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueByEmployee.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} fontSize={12} />
                        <YAxis type="category" dataKey="name" width={100} fontSize={12} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }} />
                        <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={24}>
                          {revenueByEmployee.slice(0, 8).map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" /> Ranking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {revenueByEmployee.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>
                ) : (
                  revenueByEmployee.slice(0, 6).map((emp, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-primary text-primary-foreground' : i === 1 ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.sales} vendas</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(emp.revenue)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions" className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <KPICard icon={<DollarSign />} label="Total Comissões" value={formatCurrency(commissionStats.total)} />
            <KPICard icon={<CheckCircle />} label="Pagas" value={formatCurrency(commissionStats.totalPaid)} />
            <KPICard icon={<Clock />} label="Pendentes" value={formatCurrency(commissionStats.totalPending)} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Comissões Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {commissions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma comissão registada este mês</p>
              ) : (
                <div className="space-y-2">
                  {commissions.slice(0, 10).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-sm font-medium text-foreground">{formatCurrency(c.amount)}</p>
                        <p className="text-xs text-muted-foreground">Taxa: {c.rate}%</p>
                      </div>
                      <Badge variant={c.status === 'paid' ? 'default' : 'secondary'}>
                        {c.status === 'paid' ? 'Paga' : 'Pendente'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full py-8 text-center">Nenhum funcionário activo</p>
            ) : (
              activeEmployees.map(emp => (
                <Card key={emp.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.position} · {emp.department}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">Activo</Badge>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-lg font-bold text-foreground">{formatCurrency(emp.base_salary)}</p>
                      <p className="text-xs text-muted-foreground">Salário base</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const KPICard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-4 md:p-5">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <span className="w-4 h-4">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl md:text-3xl font-bold text-foreground">{value}</p>
    </CardContent>
  </Card>
);

export default HRDashboardPage;
