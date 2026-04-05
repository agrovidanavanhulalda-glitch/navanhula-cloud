import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Users, Store } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RevenueWidgetProps {
  platformRevenue: number;
  activeSubscriptions: number;
  trialUsers: number;
  totalStores: number;
  monthlyData?: Array<{ month: string; revenue: number; subscriptions: number }>;
}

const RevenueWidget: React.FC<RevenueWidgetProps> = ({
  platformRevenue,
  activeSubscriptions,
  trialUsers,
  totalStores,
  monthlyData = [],
}) => {
  const conversionRate = totalStores > 0 ? Math.round((activeSubscriptions / totalStores) * 100) : 0;
  const arpu = activeSubscriptions > 0 ? Math.round(platformRevenue / activeSubscriptions) : 0;
  const projectedAnnual = platformRevenue * 12;

  const metrics = [
    { icon: DollarSign, label: 'MRR (Receita Mensal)', value: formatCurrency(platformRevenue), color: 'text-primary' },
    { icon: TrendingUp, label: 'ARR Projetado', value: formatCurrency(projectedAnnual), color: 'text-green-600' },
    { icon: Users, label: 'Assinaturas Ativas', value: activeSubscriptions.toString(), color: 'text-blue-600' },
    { icon: Store, label: 'Taxa de Conversão', value: `${conversionRate}%`, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <m.icon className={`w-4 h-4 ${m.color}`} />
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {monthlyData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Evolução de Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Receita"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.1)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">ARPU</p>
            <p className="text-xl font-bold">{formatCurrency(arpu)}</p>
            <p className="text-xs text-muted-foreground">por assinante/mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Em Trial</p>
            <p className="text-xl font-bold">{trialUsers}</p>
            <p className="text-xs text-muted-foreground">potenciais conversões</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RevenueWidget;
