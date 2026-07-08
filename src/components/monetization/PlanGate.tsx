import React from 'react';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PlanGateProps {
  module: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const DefaultFallback: React.FC<{ module: string }> = ({ module }) => (
  <div className="min-h-[40vh] flex items-center justify-center p-6">
    <Card className="max-w-md w-full p-8 text-center space-y-5">
      <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
        <Lock className="w-7 h-7 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">Funcionalidade Premium</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Este módulo não está disponível no seu plano atual. Faça upgrade para desbloquear.
        </p>
      </div>
      <Button asChild className="w-full gap-2">
        <Link to="/app/assinatura">
          <Crown className="w-4 h-4" />
          Ver Planos
        </Link>
      </Button>
    </Card>
  </div>
);

import { useAuth } from '@/contexts/AuthContext';

const PlanGate: React.FC<PlanGateProps> = ({ module, children, fallback }) => {
  const { canAccessModule, loading } = usePlanLimits();
  const { isFounder, isMaster } = useAuth();

  if (isFounder || isMaster) return <>{children}</>;
  if (loading) return <>{children}</>;

  if (!canAccessModule(module)) {
    return <>{fallback || <DefaultFallback module={module} />}</>;
  }

  return <>{children}</>;
};

export default PlanGate;
