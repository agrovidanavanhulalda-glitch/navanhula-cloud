import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Target, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';

const ManagerDashboardPage: React.FC = () => {
  const { user, company } = useAuth();

  const kpis = [
    { label: 'Equipa', value: '8', icon: Users, color: 'text-primary' },
    { label: 'Meta Atingida', value: '74%', icon: Target, color: 'text-amber-500' },
    { label: 'Produtividade', value: '91%', icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Tarefas Pendentes', value: '5', icon: Clock, color: 'text-red-500' },
  ];

  return (
    <PermissionGate module="dashboard" action="view">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel do Gestor</h1>
          <p className="text-muted-foreground text-sm">
            Performance da equipa e metas — {company?.name}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-muted ${kpi.color}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Membros da Equipa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['Ana Silva', 'Carlos Mendes', 'Fatima Joaquim', 'Paulo Tembe'].map((name) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {name.charAt(0)}
                      </div>
                      <span className="text-sm text-foreground">{name}</span>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Metas vs Resultados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'Vendas Diárias', target: '50', actual: '43' },
                  { label: 'Clientes Novos', target: '10', actual: '8' },
                  { label: 'Satisfação', target: '95%', actual: '92%' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {item.actual} / {item.target}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionGate>
  );
};

export default ManagerDashboardPage;
