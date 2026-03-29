import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import {
  Brain, RefreshCw, AlertTriangle, Lightbulb, TrendingUp,
  Activity, Shield, Eye, EyeOff, Loader2, Zap, Target, BarChart3
} from 'lucide-react';

interface Insight {
  id: string;
  batch_id: string | null;
  tipo: string;
  mensagem: string;
  nivel: string;
  dados: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

interface MLFeature {
  id: string;
  batch_id: string;
  idade_dias: number;
  consumo_racao: number;
  mortalidade: number;
  peso_medio: number;
  custo_acumulado: number;
  receita_parcial: number;
  peso_final: number | null;
  lucro_final: number | null;
  data: string;
}

const nivelConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  info: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: <Lightbulb className="w-4 h-4" /> },
  warning: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: <AlertTriangle className="w-4 h-4" /> },
  critico: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: <Shield className="w-4 h-4" /> },
};

const tipoLabels: Record<string, string> = {
  alerta: '⚠️ Alerta',
  recomendacao: '💡 Recomendação',
  previsao: '📊 Previsão',
};

const PoultryIntelligencePage: React.FC = () => {
  const { company } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [mlFeatures, setMlFeatures] = useState<MLFeature[]>([]);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState('alerts');

  const fetchInsights = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const { data: insightsData } = await supabase
        .from('insights_ia')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: mlData } = await supabase
        .from('ml_features')
        .select('*')
        .eq('company_id', company.id)
        .order('data', { ascending: false })
        .limit(30);

      setInsights((insightsData as any[]) || []);
      setMlFeatures((mlData as any[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const runAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('poultry-ai-insights');
      if (error) throw error;

      setAiInsights(data?.ai_insights || null);
      await fetchInsights();
      toast.success(`Análise completa! ${data?.rule_based_insights || 0} alertas gerados para ${data?.batches_analyzed || 0} lotes.`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro na análise AI');
    } finally {
      setAnalyzing(false);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from('insights_ia').update({ is_read: true } as any).eq('id', id);
    setInsights(prev => prev.map(i => i.id === id ? { ...i, is_read: true } : i));
  };

  const alerts = insights.filter(i => i.tipo === 'alerta');
  const recommendations = insights.filter(i => i.tipo === 'recomendacao');
  const predictions = insights.filter(i => i.tipo === 'previsao');
  const unreadCount = insights.filter(i => !i.is_read).length;

  const criticalCount = alerts.filter(a => a.nivel === 'critico').length;
  const warningCount = alerts.filter(a => a.nivel === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary" />
            Centro de Inteligência Avícola
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            IA que analisa, prevê e recomenda ações automaticamente
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchInsights} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={runAIAnalysis} disabled={analyzing} className="bg-gradient-to-r from-primary to-primary/80">
            {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            {analyzing ? 'Analisando...' : 'Executar Análise AI'}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center border-red-200 dark:border-red-800">
          <Shield className="w-6 h-6 text-red-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
          <p className="text-xs text-muted-foreground">Críticos</p>
        </Card>
        <Card className="p-4 text-center border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-amber-600">{warningCount}</p>
          <p className="text-xs text-muted-foreground">Avisos</p>
        </Card>
        <Card className="p-4 text-center border-blue-200 dark:border-blue-800">
          <Lightbulb className="w-6 h-6 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-blue-600">{recommendations.length}</p>
          <p className="text-xs text-muted-foreground">Recomendações</p>
        </Card>
        <Card className="p-4 text-center border-green-200 dark:border-green-800">
          <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-600">{predictions.length}</p>
          <p className="text-xs text-muted-foreground">Previsões</p>
        </Card>
        <Card className="p-4 text-center">
          <Activity className="w-6 h-6 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold">{unreadCount}</p>
          <p className="text-xs text-muted-foreground">Não Lidos</p>
        </Card>
      </div>

      {/* AI Advanced Insights */}
      {aiInsights && (
        <Card className="p-5 border-primary/30 bg-primary/5">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-primary" />
            Análise Avançada AI
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {aiInsights.risk_level && (
              <div>
                <p className="text-sm text-muted-foreground">Nível de Risco Global</p>
                <Badge className={
                  aiInsights.risk_level === 'alto' ? 'bg-red-500 text-white' :
                  aiInsights.risk_level === 'medio' ? 'bg-amber-500 text-white' :
                  'bg-green-500 text-white'
                }>
                  {aiInsights.risk_level?.toUpperCase()}
                </Badge>
              </div>
            )}
            {aiInsights.predicted_outcomes && (
              <div>
                <p className="text-sm text-muted-foreground">Lucro Total Estimado</p>
                <p className="text-lg font-bold">
                  {formatCurrency(aiInsights.predicted_outcomes.estimated_total_profit || 0)}
                </p>
                {aiInsights.predicted_outcomes.recommendation && (
                  <p className="text-xs text-muted-foreground mt-1">{aiInsights.predicted_outcomes.recommendation}</p>
                )}
              </div>
            )}
          </div>
          {aiInsights.anomalies?.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">🔍 Anomalias Detectadas</p>
              <div className="space-y-2">
                {aiInsights.anomalies.map((a: any, i: number) => (
                  <div key={i} className="p-2 rounded bg-red-50 dark:bg-red-900/20 text-sm">
                    <span className="font-medium">{a.batch}</span>: {a.description}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="alerts" className="gap-1">
            <AlertTriangle className="w-4 h-4" /> Alertas
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-1">
            <Lightbulb className="w-4 h-4" /> Dicas
          </TabsTrigger>
          <TabsTrigger value="predictions" className="gap-1">
            <Target className="w-4 h-4" /> Previsões
          </TabsTrigger>
          <TabsTrigger value="ml" className="gap-1">
            <BarChart3 className="w-4 h-4" /> ML Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <InsightsList insights={alerts} onMarkRead={markAsRead} emptyMsg="Nenhum alerta ativo. Seus lotes estão saudáveis! 🎉" />
        </TabsContent>

        <TabsContent value="recommendations">
          <InsightsList insights={recommendations} onMarkRead={markAsRead} emptyMsg="Nenhuma recomendação no momento." />
        </TabsContent>

        <TabsContent value="predictions">
          <InsightsList insights={predictions} onMarkRead={markAsRead} emptyMsg="Execute a análise AI para gerar previsões." />
        </TabsContent>

        <TabsContent value="ml">
          <MLFeaturesTable features={mlFeatures} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const InsightsList: React.FC<{ insights: Insight[]; onMarkRead: (id: string) => void; emptyMsg: string }> = ({ insights, onMarkRead, emptyMsg }) => {
  if (insights.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <p>{emptyMsg}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map(insight => {
        const cfg = nivelConfig[insight.nivel] || nivelConfig.info;
        return (
          <Card key={insight.id} className={`p-4 ${!insight.is_read ? 'border-l-4 border-l-primary' : 'opacity-75'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className={`p-2 rounded-full ${cfg.color}`}>{cfg.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{tipoLabels[insight.tipo] || insight.tipo}</Badge>
                    <Badge className={`text-xs ${cfg.color}`}>{insight.nivel}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(insight.created_at).toLocaleDateString('pt-MZ', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm">{insight.mensagem}</p>
                  {insight.dados && Object.keys(insight.dados).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(insight.dados).map(([k, v]) => (
                        <span key={k} className="text-xs bg-muted px-2 py-0.5 rounded">
                          {k}: {typeof v === 'number' ? v.toLocaleString() : String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {!insight.is_read && (
                <Button variant="ghost" size="sm" onClick={() => onMarkRead(insight.id)}>
                  <Eye className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

const MLFeaturesTable: React.FC<{ features: MLFeature[] }> = ({ features }) => {
  if (features.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Execute a análise AI para coletar dados de machine learning.
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left">Data</th>
            <th className="p-3 text-right">Idade (dias)</th>
            <th className="p-3 text-right">Ração (kg)</th>
            <th className="p-3 text-right">Mortalidade %</th>
            <th className="p-3 text-right">Peso Médio</th>
            <th className="p-3 text-right">Custo Acum.</th>
            <th className="p-3 text-right">Receita</th>
          </tr>
        </thead>
        <tbody>
          {features.map(f => (
            <tr key={f.id} className="border-b hover:bg-muted/30">
              <td className="p-3">{new Date(f.data).toLocaleDateString('pt-MZ')}</td>
              <td className="p-3 text-right">{f.idade_dias}</td>
              <td className="p-3 text-right">{Number(f.consumo_racao).toFixed(1)}</td>
              <td className="p-3 text-right">
                <span className={Number(f.mortalidade) > 5 ? 'text-red-600 font-bold' : ''}>
                  {Number(f.mortalidade).toFixed(1)}%
                </span>
              </td>
              <td className="p-3 text-right">{Number(f.peso_medio).toFixed(2)} kg</td>
              <td className="p-3 text-right">{formatCurrency(Number(f.custo_acumulado))}</td>
              <td className="p-3 text-right">{formatCurrency(Number(f.receita_parcial))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

export default PoultryIntelligencePage;
