import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Link } from 'react-router-dom';
import { Zap, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const UpsellBanner: React.FC = () => {
  const { subscription, status, daysRemaining } = useSubscription();

  // Only show for active/warning users, not blocked
  if (status === 'blocked' || status === 'cancelled' || status === 'loading') return null;

  // Show trial ending soon
  if (status === 'warning' || (status === 'active' && daysRemaining <= 5 && daysRemaining > 0)) {
    return (
      <div className="mx-4 mt-3 p-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {daysRemaining <= 3 ? '⚡ Última chance!' : '🚀 Desbloqueie todo o potencial'}
          </p>
          <p className="text-xs text-muted-foreground">
            {daysRemaining <= 3
              ? `Faltam apenas ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''}. Faça upgrade agora e ganhe 17% de desconto no plano anual.`
              : 'Faça upgrade para o Plano Profissional e tenha relatórios avançados, CRM e documentos fiscais.'}
          </p>
        </div>
        <Button asChild size="sm" className="flex-shrink-0 gap-1">
          <Link to="/app/assinatura">
            Upgrade <ArrowRight className="w-3 h-3" />
          </Link>
        </Button>
      </div>
    );
  }

  // Occasional upsell for starter plans (show ~20% of the time for non-enterprise)
  const showUpsell = !subscription || Math.random() < 0.2;
  if (!showUpsell) return null;

  return (
    <div className="mx-4 mt-3 p-3 rounded-lg border border-accent/20 bg-accent/5 flex items-center gap-3 text-sm">
      <Zap className="w-4 h-4 text-primary flex-shrink-0" />
      <span className="text-muted-foreground flex-1">
        Desbloqueie <strong className="text-foreground">Insights com IA</strong> e <strong className="text-foreground">Dashboard CEO</strong> — 
        <Link to="/app/assinatura" className="text-primary font-semibold hover:underline ml-1">
          Ver planos →
        </Link>
      </span>
    </div>
  );
};

export default UpsellBanner;
