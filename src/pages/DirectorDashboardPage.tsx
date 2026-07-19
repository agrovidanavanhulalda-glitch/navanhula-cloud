import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, TrendingUp, FileCheck, Building2, ShoppingCart } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';

const DirectorDashboardPage: React.FC = () => {
  const { user, company } = useAuth();

  const kpis = [
    { label: 'Departamentos', value: '6', icon: Building2, color: 'text-primary' },
    { label: 'Funcionários Ativos', value: '24', icon: Users, color: 'text-emerald-500' },
    { label: 'Vendas do Mês', value: '156', icon: ShoppingCart, color: 'text-amber-500' },
    { label: 'Relatórios Pendentes', value: '3', icon: FileCheck, color: 'text-red-500' },
  ];

  return (
    <PermissionGate module="dashboard" action="view">
      <WorkspaceShell workspaceType="DIRECTOR" className="p-6 space-y-6"><div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel do Diretor</h1>
          <p className="text-muted-foreground text-sm">
            Visão global de todos os departamentos — {company?.name}
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
                <BarChart3 className="w-4 h-4 text-primary" />
                Performance por Departamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['Vendas', 'RH', 'Financeiro', 'Operações'].map((dept) => (
                  <div key={dept} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{dept}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.floor(Math.random() * 40) + 60}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {Math.floor(Math.random() * 40) + 60}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                KPIs Estratégicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'Receita vs Meta', value: '87%', status: 'positive' },
                  { label: 'Satisfação Equipa', value: '92%', status: 'positive' },
                  { label: 'Turnover', value: '4%', status: 'positive' },
                  { label: 'Custos Operacionais', value: '+12%', status: 'negative' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <span className={`text-sm font-semibold tabular-nums ${item.status === 'positive' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div></WorkspaceShell>
    </PermissionGate>
  );
};

export default DirectorDashboardPage;
