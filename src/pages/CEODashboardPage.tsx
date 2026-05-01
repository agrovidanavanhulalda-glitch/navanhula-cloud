import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkeletonKPI } from '@/components/ui/skeleton-card';
import {
  Store, TrendingUp, DollarSign, Building2, ShieldAlert, CreditCard,
  Crown, Zap, Star, Activity, RefreshCw, Users, Package
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Line, Legend
} from 'recharts';
import CreateBranchDialog from '@/components/ceo/CreateBranchDialog';
import BranchListTable from '@/components/ceo/BranchListTable';

interface PlatformStats {
  total_companies: number;
  total_stores: number;
  total_users: number;
  total_sales_all: number;
  revenue_all_month: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  platform_revenue_month: number;
  total_products: number;
  sales_today: number;
}

interface BranchRow {
  id: string;
  name: string;
  company_type: string;
  city: string | null;
  is_active: boolean;
  total_users: number;
  total_stores: number;
  total_revenue: number;
  total_stock: number;
  created_at: string;
}

const KPI: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  accent?: string;
}> = ({ icon: Icon, label, value, sub, accent = 'primary' }) => (
  <Card className="p-5 hover:shadow-lg hover:border-primary/20 transition-all">
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${accent}/10`}>
        <Icon className={`w-4.5 h-4.5 text-${accent}`} />
      </div>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-2xl lg:text-3xl font-bold tracking-tight">{value}</p>
    {sub && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
  </Card>
);

const CEODashboardPage: React.FC = () => {
  const { company } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const isMaster = company?.is_system_owner === true || company?.company_type === 'master';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, branchRes] = await Promise.all([
        (supabase as any).rpc('get_platform_stats'),
        (supabase as any).rpc('get_branch_companies'),
      ]);

      if (statsRes.error) throw statsRes.error;
      if (statsRes.data?.error === 'unauthorized') { setUnauthorized(true); return; }
      setStats(statsRes.data as PlatformStats);

      if (branchRes.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data.map((b: any) => ({
          id: b.id,
          name: b.name,
          company_type: b.company_type,
          city: b.city,
          is_active: b.is_active,
          total_users: Number(b.total_users || 0),
          total_stores: Number(b.total_stores || 0),
          total_revenue: Number(b.total_revenue || 0),
          total_stock: Number(b.total_stock || 0),
          created_at: b.created_at,
        })));
      }
    } catch {
      setUnauthorized(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Access guard
  if (!isMaster && !loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center p-8">
          <ShieldAlert className="w-12 h-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Este painel é exclusivo para a administração da plataforma NAVANHULA GROUP SA.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Empresas clientes devem utilizar o Dashboard principal.
          </p>
        </Card>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center p-8">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Não Autorizado</h2>
          <p className="text-muted-foreground">Erro ao carregar dados da plataforma.</p>
        </Card>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        <div className="h-8 w-64 rounded bg-muted/50 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <SkeletonKPI key={i} />)}
        </div>
      </div>
    );
  }

  const totalBranches = branches.filter(b => b.company_type === 'branch').length;
  const totalClients = branches.filter(b => b.company_type === 'client').length;
  const globalRevenue = branches.reduce((a, b) => a + b.total_revenue, 0);
  const globalStock = branches.reduce((a, b) => a + b.total_stock, 0);
  const top5 = [...branches].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 5);

  return (
    <div className="p-4 md:p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="w-7 h-7 text-warning" />
            Painel CEO — Controle Master
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            NAVANHULA GROUP SA — Visão Global de Todas Empresas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateBranchDialog onCreated={fetchData} />
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={Building2} label="Filiais" value={totalBranches}
          sub={`${totalClients} clientes externos`} accent="primary" />
        <KPI icon={Store} label="Lojas Totais" value={stats?.total_stores ?? 0}
          sub={`${stats?.total_products ?? 0} produtos no catálogo`} accent="success" />
        <KPI icon={DollarSign} label="Receita Consolidada" value={formatCurrency(globalRevenue + (stats?.revenue_all_month ?? 0))}
          sub={`${stats?.sales_today ?? 0} vendas hoje`} accent="profit" />
        <KPI icon={Users} label="Utilizadores" value={stats?.total_users ?? 0}
          sub={`${stats?.active_subscriptions ?? 0} assinaturas ativas`} accent="primary" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1"><Package className="w-3 h-3" /> Stock Global</div>
          <p className="text-xl font-bold">{globalStock.toLocaleString('pt-MZ')}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1"><Activity className="w-3 h-3" /> Vendas Total</div>
          <p className="text-xl font-bold">{stats?.total_sales_all ?? 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1"><TrendingUp className="w-3 h-3" /> MRR</div>
          <p className="text-lg font-bold text-success">{formatCurrency(stats?.platform_revenue_month ?? 0)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1"><Zap className="w-3 h-3" /> Vendas Hoje</div>
          <p className="text-xl font-bold">{stats?.sales_today ?? 0}</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="branches" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="branches">Filiais & Clientes</TabsTrigger>
          <TabsTrigger value="top5">Top 5 Vendas</TabsTrigger>
          <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
        </TabsList>

        {/* Branch Listing */}
        <TabsContent value="branches">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Empresas Vinculadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BranchListTable branches={branches} onRefresh={fetchData} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top 5 */}
        <TabsContent value="top5">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="w-5 h-5 text-warning" /> Top 5 — Receita Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {top5.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">Sem dados</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={Math.min(top5.length * 50 + 40, 320)}>
                    <BarChart data={top5} layout="vertical" barSize={22}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="total_revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Receita" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {top5.map((b, i) => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Badge variant={i === 0 ? 'default' : 'secondary'} className="w-7 h-7 rounded-full flex items-center justify-center p-0 text-xs">
                            {i + 1}
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">{b.name}</p>
                            <p className="text-xs text-muted-foreground">{b.city || '—'} · {b.total_stores} lojas</p>
                          </div>
                        </div>
                        <p className="font-bold text-sm">{formatCurrency(b.total_revenue)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions */}
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> Gestão de Assinaturas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4 text-center border-success/20">
                  <p className="text-xs text-muted-foreground mb-1">Ativas</p>
                  <p className="text-3xl font-bold text-success">{stats?.active_subscriptions ?? 0}</p>
                </Card>
                <Card className="p-4 text-center border-warning/20">
                  <p className="text-xs text-muted-foreground mb-1">Em Teste</p>
                  <p className="text-3xl font-bold text-warning">{stats?.trial_subscriptions ?? 0}</p>
                </Card>
                <Card className="p-4 text-center border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">MRR Total</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(stats?.platform_revenue_month ?? 0)}</p>
                </Card>
              </div>
              <div className="text-center text-muted-foreground py-4">
                <p className="text-sm">Plano padrão: <strong>1.500 MT</strong> por loja ativa/mês</p>
                <p className="text-xs mt-1">Filiais (billing_exempt) não pagam assinatura.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CEODashboardPage;
