import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle, XCircle, TrendingDown, ArrowUpFromLine, Clock,
  RefreshCw, Bell, CheckCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface StockAlert {
  id: string;
  product_id: string;
  type: string;
  message: string;
  status: string;
  created_at: string;
}

const alertConfig: Record<string, { icon: React.ElementType; color: string; label: string; bg: string }> = {
  out_of_stock: { icon: XCircle, color: 'text-destructive', label: 'Sem Estoque', bg: 'bg-destructive/10 border-destructive/30' },
  critical: { icon: AlertTriangle, color: 'text-red-600', label: 'Crítico', bg: 'bg-red-50 border-red-200' },
  low: { icon: TrendingDown, color: 'text-orange-600', label: 'Baixo', bg: 'bg-orange-50 border-orange-200' },
  excess: { icon: ArrowUpFromLine, color: 'text-blue-600', label: 'Excesso', bg: 'bg-blue-50 border-blue-200' },
  inactive: { icon: Clock, color: 'text-purple-600', label: 'Parado', bg: 'bg-purple-50 border-purple-200' },
};

const StockAlertsPanel: React.FC = () => {
  const { store } = useAuth();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    if (store?.id) loadAlerts();
  }, [store?.id]);

  const loadAlerts = async () => {
    if (!store?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('stock_alerts' as any)
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50);
    setAlerts((data as any[]) || []);
    setLoading(false);
  };

  const evaluateAlerts = async () => {
    if (!store?.id) return;
    setEvaluating(true);
    try {
      const { data, error } = await supabase.rpc('evaluate_stock_alerts' as any, {
        p_store_id: store.id,
      });
      if (error) throw error;
      await loadAlerts();
    } catch (err: any) {
      console.error('Error evaluating alerts:', err.message);
    } finally {
      setEvaluating(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    await supabase
      .from('stock_alerts' as any)
      .update({ status: 'resolved', resolved_at: new Date().toISOString() } as any)
      .eq('id', alertId);
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const groupedAlerts = alerts.reduce((acc, alert) => {
    if (!acc[alert.type]) acc[alert.type] = [];
    acc[alert.type].push(alert);
    return acc;
  }, {} as Record<string, StockAlert[]>);

  const alertOrder = ['out_of_stock', 'critical', 'low', 'excess', 'inactive'];

  if (alerts.length === 0 && !loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4" /> Alertas de Estoque
          </h3>
          <Button variant="outline" size="sm" onClick={evaluateAlerts} disabled={evaluating}>
            <RefreshCw className={`w-3 h-3 mr-1 ${evaluating ? 'animate-spin' : ''}`} />
            Analisar
          </Button>
        </div>
        <div className="text-center py-6 text-muted-foreground">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm">Nenhum alerta activo</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Bell className="w-4 h-4" /> Alertas de Estoque
          <Badge variant="destructive" className="text-xs">{alerts.length}</Badge>
        </h3>
        <Button variant="outline" size="sm" onClick={evaluateAlerts} disabled={evaluating}>
          <RefreshCw className={`w-3 h-3 mr-1 ${evaluating ? 'animate-spin' : ''}`} />
          Analisar
        </Button>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        {alertOrder.map(type => {
          const count = groupedAlerts[type]?.length || 0;
          if (count === 0) return null;
          const cfg = alertConfig[type];
          return (
            <Badge key={type} variant="outline" className={`${cfg.bg} ${cfg.color} text-xs`}>
              {cfg.label}: {count}
            </Badge>
          );
        })}
      </div>

      {/* Alert list */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {alertOrder.map(type =>
          (groupedAlerts[type] || []).map(alert => {
            const cfg = alertConfig[alert.type] || alertConfig.low;
            const Icon = cfg.icon;
            return (
              <div key={alert.id} className={`flex items-start gap-2 p-2 rounded-lg border ${cfg.bg}`}>
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                <p className="text-xs flex-1">{alert.message}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => resolveAlert(alert.id)}
                >
                  <CheckCircle className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

export default StockAlertsPanel;
