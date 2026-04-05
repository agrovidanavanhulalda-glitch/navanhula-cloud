import React, { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/formatters';
import { CreditCard, AlertTriangle, CheckCircle2, XCircle, Clock, Phone, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PlanSelector from '@/components/monetization/PlanSelector';
import type { PlanTier } from '@/lib/plans';

const SubscriptionPage: React.FC = () => {
  const { company, role } = useAuth();
  const { subscription, payments, status, daysRemaining, loading, refresh } = useSubscription();
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payMethod, setPayMethod] = useState<'mpesa' | 'emola'>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);

  const isAdmin = role === 'admin' || role === 'manager';

  const handlePayment = async () => {
    if (!subscription || !phoneNumber) {
      toast.error('Informe o número de telefone');
      return;
    }

    setProcessing(true);
    try {
      const functionName = payMethod === 'mpesa' ? 'process-mpesa-payment' : 'process-emola-payment';
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          subscription_id: subscription.id,
          phone_number: phoneNumber,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message || 'Pagamento processado!');
        if (data.test_mode) {
          toast.info('Modo de teste: credenciais da API não configuradas.');
        }
        setShowPayDialog(false);
        setPhoneNumber('');
        refresh();
      } else {
        toast.error(data?.error || 'Erro no pagamento');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      toast.error(err.message || 'Erro ao processar pagamento');
    } finally {
      setProcessing(false);
    }
  };

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
    <>
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assinatura</h1>
        <p className="text-muted-foreground">{company?.name || 'Empresa'}</p>
      </div>

      {/* Plan Selection */}
      <PlanSelector
        currentTier={(subscription as any)?.plan_tier || 'pro'}
        onSelect={async (tier: PlanTier, yearly: boolean) => {
          if (!subscription) {
            toast.error('Nenhuma assinatura encontrada');
            return;
          }
          try {
            const { error } = await supabase
              .from('subscriptions')
              .update({ plan_tier: tier } as any)
              .eq('id', subscription.id);
            if (error) throw error;
            toast.success(`Plano alterado para ${tier === 'starter' ? 'Starter' : tier === 'pro' ? 'Profissional' : 'Enterprise'}!`);
            refresh();
          } catch (err: any) {
            toast.error(err.message || 'Erro ao alterar plano');
          }
        }}
      />

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
            <span className="font-semibold">{formatCurrency(subscription?.price_monthly || 1500)}</span>
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

      {/* Payment Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pagar Assinatura
          </CardTitle>
          <CardDescription>Pague via M-Pesa ou E-mola automaticamente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              className="h-16 flex flex-col gap-1"
              variant="outline"
              onClick={() => { setPayMethod('mpesa'); setShowPayDialog(true); }}
            >
              <Phone className="w-5 h-5 text-primary" />
              <span>Pagar com M-Pesa</span>
            </Button>
            <Button
              className="h-16 flex flex-col gap-1"
              variant="outline"
              onClick={() => { setPayMethod('emola'); setShowPayDialog(true); }}
            >
              <Phone className="w-5 h-5 text-primary" />
              <span>Pagar com E-mola</span>
            </Button>
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
            O sistema custa 1.500 MT por mês por loja ativa. Em caso de não pagamento, o sistema será suspenso automaticamente. 
            Os dados permanecem seguros e disponíveis ao reconectar o pagamento.
          </p>
        </CardContent>
      </Card>
    </div>

      {/* Payment Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Pagar com {payMethod === 'mpesa' ? 'M-Pesa' : 'E-mola'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Valor</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(subscription?.price_monthly || 1500)}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Número de telefone {payMethod === 'mpesa' ? '(84/85)' : '(86/87)'}
              </label>
              <Input
                placeholder={payMethod === 'mpesa' ? '84XXXXXXX' : '86XXXXXXX'}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="text-lg h-12"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Ao confirmar, será enviada uma solicitação de pagamento para o seu telefone. Confirme no seu dispositivo.
            </p>
            <Button
              className="w-full h-12"
              onClick={handlePayment}
              disabled={processing || !phoneNumber}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  Confirmar Pagamento
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubscriptionPage;
