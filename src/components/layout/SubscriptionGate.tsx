import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Lock, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SubscriptionGateProps {
  children: React.ReactNode;
  /** Pages that should still be accessible when blocked */
  bypass?: boolean;
}

const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ children, bypass = false }) => {
  const { status, loading, daysRemaining } = useSubscription();
  const { isFounder, isMaster } = useAuth();

  // FOUNDER / MASTER: unrestricted lifetime access
  if (isFounder || isMaster) return <>{children}</>;

  if (loading || bypass) return <>{children}</>;

  // Trial warning banner
  if (status === 'warning') {
    return (
      <>
        <div className="mx-4 mt-2 mb-0 p-3 rounded-lg border border-warning/30 bg-warning/10 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
          <span className="text-foreground">
            Seu período de teste termina em <strong>{daysRemaining} dia{daysRemaining !== 1 ? 's' : ''}</strong>.{' '}
            <Link to="/app/assinatura" className="text-primary font-semibold hover:underline">
              Ativar assinatura →
            </Link>
          </span>
        </div>
        {children}
      </>
    );
  }

  // Blocked — subscription expired
  if (status === 'blocked' || status === 'cancelled') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="max-w-lg w-full p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-destructive" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Acesso Bloqueado</h2>
            <p className="text-muted-foreground leading-relaxed">
              Seu período de teste terminou. Ative sua assinatura para continuar usando <strong>NAVANHULA CLOUD</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
            <p className="text-sm font-semibold text-foreground">Plano Profissional</p>
            <p className="text-3xl font-black text-primary">1.500 MT<span className="text-sm font-normal text-muted-foreground"> /loja/mês</span></p>
          </div>

          <Button asChild size="lg" className="w-full gap-2 text-base font-bold">
            <Link to="/app/assinatura">
              <CreditCard className="w-5 h-5" />
              Ativar Assinatura
            </Link>
          </Button>

          <p className="text-xs text-muted-foreground">
            Você ainda pode visualizar relatórios e histórico.
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default SubscriptionGate;
