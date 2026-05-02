import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, Package, Clock } from 'lucide-react';

interface AlertItem {
  type: 'no_sales' | 'low_stock' | 'revenue_drop';
  company_name: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

const AlertsList: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const items: AlertItem[] = [];
      
      // 1. No sales
      const { data: noSales } = await supabase.rpc('get_companies_no_sales', { days_count: 3 });
      if (noSales) {
        noSales.forEach((c: any) => {
          items.push({
            type: 'no_sales',
            company_name: c.company_name,
            message: `Sem vendas há mais de 3 dias (Última: ${c.last_sale_date ? new Date(c.last_sale_date).toLocaleDateString() : 'Nunca'})`,
            severity: 'high'
          });
        });
      }

      // 2. Low stock
      const { data: lowStock } = await supabase.rpc('get_global_low_stock');
      if (lowStock) {
        lowStock.slice(0, 10).forEach((p: any) => {
          items.push({
            type: 'low_stock',
            company_name: p.company_name,
            message: `Produto "${p.product_name}" com stock crítico: ${p.current_stock} (Min: ${p.min_stock})`,
            severity: 'medium'
          });
        });
      }

      setAlerts(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  if (loading) return <p className="text-center py-8">Carregando alertas...</p>;
  if (alerts.length === 0) return <p className="text-center py-8 text-muted-foreground">Nenhum alerta crítico no momento.</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {alerts.map((alert, idx) => (
        <Card key={idx} className={`border-l-4 ${
          alert.severity === 'high' ? 'border-l-destructive' : 
          alert.severity === 'medium' ? 'border-l-warning' : 'border-l-info'
        }`}>
          <CardContent className="p-4 flex items-start gap-4">
            <div className={`p-2 rounded-full ${
              alert.severity === 'high' ? 'bg-destructive/10 text-destructive' : 
              alert.severity === 'medium' ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info'
            }`}>
              {alert.type === 'no_sales' ? <Clock className="w-5 h-5" /> : 
               alert.type === 'low_stock' ? <Package className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm uppercase tracking-tight">{alert.company_name}</span>
                <Badge variant={alert.severity === 'high' ? 'destructive' : 'outline'} className="text-[10px]">
                  {alert.severity.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{alert.message}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AlertsList;
