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
  Crown, Zap, Star, Activity, RefreshCw, Users, Package, History, AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, AreaChart, Area, Legend
} from 'recharts';
import CreateBranchDialog from '@/components/ceo/CreateBranchDialog';
import BranchListTable from '@/components/ceo/BranchListTable';
import GlobalUserList from '@/components/ceo/GlobalUserList';
import AuditLogList from '@/components/ceo/AuditLogList';
import AlertsList from '@/components/ceo/AlertsList';

interface PlatformStats {
  total_companies: number;
  total_stores: number;
  total_users: number;
  total_sales_all: number;
  revenue_all_month: number;
  profit_consolidated: number;
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
  <Card className="p-5 hover:shadow-lg hover:border-primary/20 transition-all border-none bg-white/50 backdrop-blur-sm shadow-sm">
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${accent}/10`}>
        <Icon className={`w-5 h-5 text-${accent}`} />
      </div>
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-3xl font-bold tracking-tight">{value}</p>
    {sub && <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">{sub}</p>}
  </Card>
);

const CEODashboardPage: React.FC = () => {
  const { company } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [revenueByCompany, setRevenueByCompany] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const isMaster = company?.is_master === true || company?.is_system_owner === true;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, branchRes, trendRes, revCompRes] = await Promise.all([
        supabase.rpc('get_platform_stats'),
        supabase.rpc('get_branch_companies'),
        supabase.rpc('get_global_sales_trend', { days_count: 7 }),
        supabase.rpc('get_revenue_by_company'),
      ]);

      if (statsRes.error) throw statsRes.error;
      const statsData = statsRes.data as any;
      if (statsData?.error === 'unauthorized') { setUnauthorized(true); return; }
      setStats(statsData as PlatformStats);

      if (branchRes.data) setBranches(branchRes.data as BranchRow[]);
      if (trendRes.data) setSalesTrend(trendRes.data as any[]);
      if (revCompRes.data) setRevenueByCompany(revCompRes.data as any[]);

    } catch (err) {
      console.error(err);
      setUnauthorized(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 

    // Real-time subscription for CEO Dashboard
    const channel = supabase
      .channel('ceo-dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'companies',
        },
        () => {
          console.log('[CEO] Companies change detected, refreshing stats...');
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'branches',
        },
        () => {
          console.log('[CEO] Branches change detected, refreshing stats...');
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales',
        },
        () => {
          // Refresh stats when new sales happen globally
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  if (!isMaster && !loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[70vh]">
        <Card className="max-w-md w-full text-center p-12 border-none shadow-2xl">
          <ShieldAlert className="w-16 h-16 text-warning mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Acesso Reservado</h2>
          <p className="text-muted-foreground">
            Este painel é de uso exclusivo do CEO Global para gestão consolidada do ecossistema.
          </p>
          <Button variant="outline" className="mt-8" onClick={() => window.location.href='/app/dashboard'}>
            Voltar ao Dashboard Local
          </Button>
        </Card>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="p-6 space-y-8 animate-pulse">
        <div className="h-10 w-80 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-[#F5F7FA] min-h-screen animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 py-1 px-3">NAVANHULA CLOUD GLOBAL</Badge>
            {stats?.sales_today && stats.sales_today > 0 && (
              <Badge className="bg-success text-white border-none py-1 px-3">+{stats.sales_today} VENDAS HOJE</Badge>
            )}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0B3C5D] flex items-center gap-3">
            Dashboard CEO Master
            <Crown className="w-8 h-8 text-[#F4B400]" />
          </h1>
          <p className="text-muted-foreground font-medium">Controle total multi-empresa e visão estratégica consolidada.</p>
        </div>
        <div className="flex items-center gap-3">
          <CreateBranchDialog onCreated={fetchData} />
          <Button variant="outline" onClick={fetchData} disabled={loading} className="shadow-sm border-none bg-white">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPI 
          icon={Building2} 
          label="Empresas" 
          value={stats?.total_companies ?? 0}
          sub={<><Activity className="w-3 h-3 text-success" /> {stats?.total_stores} lojas ativas</>}
          accent="primary"
        />
        <KPI 
          icon={Users} 
          label="Utilizadores" 
          value={stats?.total_users ?? 0}
          sub={<><ShieldAlert className="w-3 h-3 text-warning" /> 24 novos este mês</>}
          accent="primary"
        />
        <KPI 
          icon={DollarSign} 
          label="Receita Mensal" 
          value={formatCurrency(stats?.revenue_all_month ?? 0)}
          sub={<><TrendingUp className="w-3 h-3 text-success" /> Consolidado de todas empresas</>}
          accent="success"
        />
        <KPI 
          icon={TrendingUp} 
          label="Lucro Total" 
          value={formatCurrency(stats?.profit_consolidated ?? 0)}
          sub={<><Star className="w-3 h-3 text-[#F4B400]" /> Eficiência operacional global</>}
          accent="profit"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-gray-50 bg-gray-50/30">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Vendas nos Últimos 7 Dias
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0B3C5D" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0B3C5D" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="sale_date" tickFormatter={(str) => new Date(str).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' })} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(val) => `MT ${val}`} />
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="total_sales" stroke="#0B3C5D" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-gray-50 bg-gray-50/30">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#F4B400]" /> Receita por Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByCompany} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="company_name" type="category" width={100} axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 500}} />
                  <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="revenue" fill="#1E5A8A" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Control */}
      <Tabs defaultValue="companies" className="space-y-6">
        <TabsList className="bg-white p-1 border-none shadow-sm h-12 gap-1 rounded-xl">
          <TabsTrigger value="companies" className="rounded-lg data-[state=active]:bg-[#0B3C5D] data-[state=active]:text-white transition-all gap-2">
            <Building2 className="w-4 h-4" /> Empresas
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-[#0B3C5D] data-[state=active]:text-white transition-all gap-2">
            <Users className="w-4 h-4" /> Utilizadores
          </TabsTrigger>
          <TabsTrigger value="alerts" className="rounded-lg data-[state=active]:bg-[#0B3C5D] data-[state=active]:text-white transition-all gap-2">
            <AlertCircle className="w-4 h-4" /> Alertas {branches.length > 0 && <span className="flex h-2 w-2 rounded-full bg-destructive animate-pulse" />}
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-lg data-[state=active]:bg-[#0B3C5D] data-[state=active]:text-white transition-all gap-2">
            <History className="w-4 h-4" /> Auditoria
          </TabsTrigger>
          <TabsTrigger value="finance" className="rounded-lg data-[state=active]:bg-[#0B3C5D] data-[state=active]:text-white transition-all gap-2">
            <DollarSign className="w-4 h-4" /> Financeiro Global
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="animate-in slide-in-from-bottom-2 duration-300">
          <Card className="border-none shadow-sm overflow-hidden bg-white">
            <CardContent className="p-0">
              <BranchListTable branches={branches} onRefresh={fetchData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="animate-in slide-in-from-bottom-2 duration-300">
          <Card className="border-none shadow-sm p-6 bg-white">
            <GlobalUserList />
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="animate-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-4">
             <AlertsList />
          </div>
        </TabsContent>

        <TabsContent value="audit" className="animate-in slide-in-from-bottom-2 duration-300">
          <Card className="border-none shadow-sm p-6 bg-white">
            <AuditLogList />
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="animate-in slide-in-from-bottom-2 duration-300">
          <Card className="border-none shadow-sm p-12 text-center bg-white">
            <DollarSign className="w-16 h-16 text-primary/20 mx-auto mb-6" />
            <h3 className="text-xl font-bold mb-2">Módulo de Faturamento Global</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Visualização detalhada de assinaturas, métodos de pagamento e fluxo de caixa consolidado do sistema.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
              <div className="p-6 bg-[#F5F7FA] rounded-2xl">
                <p className="text-xs text-muted-foreground font-bold uppercase mb-2">Assinaturas Ativas</p>
                <p className="text-2xl font-bold text-[#0B3C5D]">{stats?.active_subscriptions ?? 0}</p>
              </div>
              <div className="p-6 bg-[#F5F7FA] rounded-2xl">
                <p className="text-xs text-muted-foreground font-bold uppercase mb-2">Trials em Curso</p>
                <p className="text-2xl font-bold text-[#F4B400]">{stats?.trial_subscriptions ?? 0}</p>
              </div>
              <div className="p-6 bg-[#F5F7FA] rounded-2xl">
                <p className="text-xs text-muted-foreground font-bold uppercase mb-2">Churn Rate</p>
                <p className="text-2xl font-bold text-success">1.2%</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CEODashboardPage;

