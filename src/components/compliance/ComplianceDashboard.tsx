import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Shield, FileCheck, AlertTriangle, XCircle, Clock, TrendingUp,
  RefreshCw, Activity, CheckCircle2, ArrowRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { differenceInDays, parseISO, format } from 'date-fns';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';

interface ComplianceMetrics {
  total: number;
  validos: number;
  expirando: number;
  urgentes: number;
  expirados: number;
  complianceRate: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface CriticalDoc {
  id: string;
  file_name: string;
  expiration_date: string;
  alert_level: string;
  days_remaining: number;
  obligation_name: string;
}

const COLORS = {
  valid: 'hsl(160, 84%, 39%)',
  warning: 'hsl(38, 92%, 50%)',
  urgent: 'hsl(25, 95%, 53%)',
  expired: 'hsl(0, 84%, 60%)',
};

const ComplianceDashboard: React.FC = () => {
  const { company } = useAuth();
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [criticalDocs, setCriticalDocs] = useState<CriticalDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);

    try {
      // Fetch all docs with expiration
      const { data: docs } = await supabase
        .from('obligation_documents')
        .select('id, file_name, expiration_date, alert_level, obligation_id')
        .eq('company_id', company.id);

      // Fetch obligations for names
      const { data: obligations } = await supabase
        .from('obligations')
        .select('id, name')
        .eq('company_id', company.id);

      const obligationMap = new Map((obligations || []).map(o => [o.id, o.name]));
      const allDocs = docs || [];

      // Calculate metrics
      let validos = 0, expirando = 0, urgentes = 0, expirados = 0;
      const critical: CriticalDoc[] = [];

      allDocs.forEach(doc => {
        if (!doc.expiration_date) {
          validos++;
          return;
        }
        const days = differenceInDays(parseISO(doc.expiration_date), new Date());

        if (days <= 0) {
          expirados++;
          critical.push({ ...doc, days_remaining: days, obligation_name: obligationMap.get(doc.obligation_id) || 'N/A', alert_level: 'EXPIRED', expiration_date: doc.expiration_date });
        } else if (days <= 7) {
          urgentes++;
          critical.push({ ...doc, days_remaining: days, obligation_name: obligationMap.get(doc.obligation_id) || 'N/A', alert_level: 'URGENT', expiration_date: doc.expiration_date });
        } else if (days <= 30) {
          expirando++;
          critical.push({ ...doc, days_remaining: days, obligation_name: obligationMap.get(doc.obligation_id) || 'N/A', alert_level: 'WARNING', expiration_date: doc.expiration_date });
        } else {
          validos++;
        }
      });

      const total = allDocs.length || 1;
      const complianceRate = Math.round((validos / total) * 100);
      const rawRisk = total > 0 ? (expirados * 3 + urgentes * 2 + expirando * 1) / total : 0;
      const riskScore = Math.min(Math.round(rawRisk * 100) / 100, 1);
      const riskLevel: ComplianceMetrics['riskLevel'] = riskScore <= 0.2 ? 'low' : riskScore <= 0.6 ? 'medium' : 'high';

      setMetrics({ total: allDocs.length, validos, expirando, urgentes, expirados, complianceRate, riskScore, riskLevel });
      setCriticalDocs(critical.sort((a, b) => a.days_remaining - b.days_remaining));
    } catch (err) {
      console.error('Compliance metrics error:', err);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  // Realtime subscription
  useEffect(() => {
    if (!company?.id) return;
    const channel = supabase
      .channel('compliance-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'obligation_documents' }, () => fetchMetrics())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [company?.id, fetchMetrics]);

  if (loading && !metrics) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="p-4"><div className="h-16 rounded bg-muted/50 animate-pulse" /></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const pieData = [
    { name: 'Válidos', value: metrics.validos, color: COLORS.valid },
    { name: 'A Expirar', value: metrics.expirando, color: COLORS.warning },
    { name: 'Urgentes', value: metrics.urgentes, color: COLORS.urgent },
    { name: 'Expirados', value: metrics.expirados, color: COLORS.expired },
  ].filter(d => d.value > 0);

  const riskColorMap = { low: 'text-success', medium: 'text-warning', high: 'text-destructive' };
  const riskBgMap = { low: 'bg-success/10', medium: 'bg-warning/10', high: 'bg-destructive/10' };
  const riskLabelMap = { low: '🟢 Baixo', medium: '🟡 Médio', high: '🔴 Alto' };

  // Smart insight
  const getInsight = () => {
    if (metrics.expirados > 0) return { icon: XCircle, text: `⚠️ ${metrics.expirados} documento(s) expirado(s). Risco elevado de não conformidade. Aja imediatamente.`, level: 'destructive' as const };
    if (metrics.urgentes > 0) return { icon: AlertTriangle, text: `🚨 ${metrics.urgentes} documento(s) expiram em menos de 7 dias. Renove agora.`, level: 'warning' as const };
    if (metrics.expirando > 0) return { icon: Clock, text: `⏳ ${metrics.expirando} documento(s) a expirar nos próximos 30 dias. Planifique a renovação.`, level: 'info' as const };
    return { icon: CheckCircle2, text: '✅ Compliance sob controle. Todos os documentos estão válidos.', level: 'success' as const };
  };

  const insight = getInsight();
  const InsightIcon = insight.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Dashboard de Compliance
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Visão executiva · Atualização em tempo real</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading} className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Smart Insight Banner */}
      <Card className={`p-4 border-l-4 ${insight.level === 'destructive' ? 'border-l-destructive bg-destructive/5' : insight.level === 'warning' ? 'border-l-warning bg-warning/5' : insight.level === 'info' ? 'border-l-primary bg-primary/5' : 'border-l-success bg-success/5'}`}>
        <div className="flex items-center gap-3">
          <InsightIcon className={`w-5 h-5 flex-shrink-0 ${insight.level === 'destructive' ? 'text-destructive' : insight.level === 'warning' ? 'text-warning' : insight.level === 'info' ? 'text-primary' : 'text-success'}`} />
          <p className="text-sm font-medium">{insight.text}</p>
        </div>
      </Card>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-wider mb-1">
            <FileCheck className="w-3 h-3" /> Total
          </div>
          <p className="text-2xl font-bold">{metrics.total}</p>
          <p className="text-[10px] text-muted-foreground">documentos</p>
        </Card>

        <Card className="p-4 border-success/20">
          <div className="flex items-center gap-1.5 text-success text-[10px] uppercase tracking-wider mb-1">
            <CheckCircle2 className="w-3 h-3" /> Válidos
          </div>
          <p className="text-2xl font-bold text-success">{metrics.validos}</p>
          <p className="text-[10px] text-muted-foreground">{metrics.complianceRate}% compliance</p>
        </Card>

        <Card className="p-4 border-warning/20">
          <div className="flex items-center gap-1.5 text-warning text-[10px] uppercase tracking-wider mb-1">
            <Clock className="w-3 h-3" /> A Expirar
          </div>
          <p className="text-2xl font-bold text-warning">{metrics.expirando}</p>
          <p className="text-[10px] text-muted-foreground">≤ 30 dias</p>
        </Card>

        <Card className="p-4 border-orange-500/20">
          <div className="flex items-center gap-1.5 text-orange-600 text-[10px] uppercase tracking-wider mb-1">
            <AlertTriangle className="w-3 h-3" /> Urgentes
          </div>
          <p className="text-2xl font-bold text-orange-600">{metrics.urgentes}</p>
          <p className="text-[10px] text-muted-foreground">≤ 7 dias</p>
        </Card>

        <Card className="p-4 border-destructive/20">
          <div className="flex items-center gap-1.5 text-destructive text-[10px] uppercase tracking-wider mb-1">
            <XCircle className="w-3 h-3" /> Expirados
          </div>
          <p className="text-2xl font-bold text-destructive">{metrics.expirados}</p>
          <p className="text-[10px] text-muted-foreground">ação imediata</p>
        </Card>

        <Card className={`p-4 ${riskBgMap[metrics.riskLevel]}`}>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-1">
            <Activity className="w-3 h-3" /> Risco
          </div>
          <p className={`text-2xl font-bold ${riskColorMap[metrics.riskLevel]}`}>
            {(metrics.riskScore * 100).toFixed(0)}%
          </p>
          <p className="text-[10px] text-muted-foreground">{riskLabelMap[metrics.riskLevel]}</p>
        </Card>
      </div>

      {/* Charts + Critical List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Distribuição
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [v, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
            )}
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-1 text-[10px]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Taxa de Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[240px]">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="15.9" fill="none"
                  stroke={metrics.complianceRate >= 80 ? COLORS.valid : metrics.complianceRate >= 50 ? COLORS.warning : COLORS.expired}
                  strokeWidth="2.5" strokeDasharray={`${metrics.complianceRate} ${100 - metrics.complianceRate}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{metrics.complianceRate}%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {metrics.complianceRate >= 80 ? 'Excelente conformidade' : metrics.complianceRate >= 50 ? 'Conformidade moderada' : 'Conformidade crítica'}
            </p>
          </CardContent>
        </Card>

        {/* Critical Documents */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Documentos Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {criticalDocs.length === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mb-2 text-success" />
                <p className="text-sm">Nenhum documento crítico</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {criticalDocs.slice(0, 8).map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{doc.file_name}</p>
                      <p className="text-[10px] text-muted-foreground">{doc.obligation_name}</p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <Badge variant={doc.alert_level === 'EXPIRED' ? 'destructive' : 'secondary'} className="text-[9px] px-1.5">
                        {doc.days_remaining <= 0 ? `${Math.abs(doc.days_remaining)}d atrasado` : `${doc.days_remaining}d restantes`}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComplianceDashboard;
