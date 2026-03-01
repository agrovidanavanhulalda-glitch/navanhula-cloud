import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { CreditCard, AlertTriangle, CheckCircle2, XCircle, Clock, Phone } from 'lucide-react';

const SubscriptionPage: React.FC = () => {
  const { company, role } = useAuth();
  const { subscription, payments, status, daysRemaining, loading } = useSubscription();

  const isAdmin = role === 'admin' || role === 'manager';

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold">Acesso Restrito</h2>
            <p className="text-muted-foreground">Apenas administradores podem gerir assinaturas.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Clock className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const statusConfig = {
    active: { label: 'Ativo', variant: 'default' as const, icon: CheckCircle2, color: 'text-green-600' },
    warning: { label: 'Aviso - Regularize', variant: 'secondary' as const, icon: AlertTriangle, color: 'text-yellow-600' },
    blocked: { label: 'Bloqueado', variant: 'destructive' as const, icon: XCircle, color: 'text-destructive' },
    cancelled: { label: 'Cancelado', variant: 'outline' as const, icon: XCircle, color: 'text-muted-foreground' },
    loading: { label: 'Carregando...', variant: 'outline' as const, icon: Clock, color: 'text-muted-foreground' },
  };

  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assinatura</h1>
        <p className="text-muted-foreground">{company?.name || 'Empresa'}</p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${cfg.color}`} />
            Estado da Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estado</span>
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Valor mensal</span>
            <span className="font-semibold">{formatCurrency(subscription?.price_monthly || 1000)}</span>
          </div>
          {subscription && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Período atual</span>
                <span className="text-sm">
                  {new Date(subscription.current_period_start).toLocaleDateString('pt-MZ')} — {new Date(subscription.current_period_end).toLocaleDateString('pt-MZ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Dias restantes</span>
                <span className={`font-semibold ${daysRemaining <= 5 ? 'text-destructive' : ''}`}>
                  {daysRemaining} dias
                </span>
              </div>
            </>
          )}

          {status === 'warning' && (
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">Seu plano expirou!</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Regularize o pagamento para evitar o bloqueio do sistema. Você tem {subscription?.grace_period_days || 5} dias de tolerância.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === 'blocked' && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Sistema bloqueado!</p>
                  <p className="text-sm text-muted-foreground">
                    As vendas e abertura de caixa estão suspensas. Regularize o pagamento para continuar.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Como Pagar
          </CardTitle>
          <CardDescription>Métodos de pagamento aceites</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                <span className="font-medium">M-Pesa</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Envie {formatCurrency(1000)} para o número de pagamento M-Pesa e informe a referência.
              </p>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-green-600" />
                <span className="font-medium">E-mola</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Envie {formatCurrency(1000)} via E-mola e informe a referência da transação.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
          <CardDescription>Últimos pagamentos realizados</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum pagamento registado.</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      {p.payment_method === 'mpesa' ? 'M-Pesa' : p.payment_method === 'emola' ? 'E-mola' : 'Manual'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString('pt-MZ') : 'Pendente'}
                      {p.reference_id && ` • Ref: ${p.reference_id}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(p.amount)}</p>
                    <Badge variant={p.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                      {p.status === 'completed' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legal Terms */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground text-center">
            O sistema custa 1.000 MT por mês. Em caso de não pagamento, o sistema será suspenso automaticamente. 
            Os dados permanecem seguros e disponíveis ao reconectar o pagamento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionPage;
