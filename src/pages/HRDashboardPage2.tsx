import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Banknote, CalendarOff, AlertTriangle, Clock, UserCheck } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';

const HRDashboardPage2: React.FC = () => {
  const { company } = useAuth();

  const kpis = [
    { label: 'Funcionários Ativos', value: '24', icon: Users, color: 'text-primary' },
    { label: 'Folha Salarial', value: '1.2M MT', icon: Banknote, color: 'text-emerald-500' },
    { label: 'Faltas (Mês)', value: '7', icon: CalendarOff, color: 'text-amber-500' },
    { label: 'Pagamentos Pendentes', value: '2', icon: AlertTriangle, color: 'text-red-500' },
  ];

  return (
    <PermissionGate module="hr" action="view">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel de RH</h1>
          <p className="text-muted-foreground text-sm">
            Gestão de pessoal e folha de pagamento — {company?.name}
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
                <Clock className="w-4 h-4 text-primary" />
                Presenças Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Ana Silva', status: 'Presente', time: '07:45' },
                  { name: 'Carlos Mendes', status: 'Presente', time: '08:02' },
                  { name: 'Fatima Joaquim', status: 'Falta', time: '-' },
                  { name: 'Paulo Tembe', status: 'Atraso', time: '09:15' },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${
                        item.status === 'Presente' ? 'text-emerald-500' :
                        item.status === 'Falta' ? 'text-red-500' : 'text-amber-500'
                      }`}>{item.status}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Alertas de RH
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  'Salário de Março pendente (2 funcionários)',
                  'Contrato de João expira em 15 dias',
                  'Férias acumuladas: Ana Silva (18 dias)',
                ].map((alert, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">{alert}</span>
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

export default HRDashboardPage2;
