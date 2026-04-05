import React from 'react';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { AlertTriangle, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LimitWarningProps {
  resource: 'products' | 'sellers' | 'stores';
  current: number;
}

const resourceLabels: Record<string, string> = {
  products: 'produtos',
  sellers: 'vendedores',
  stores: 'lojas',
};

const LimitWarning: React.FC<LimitWarningProps> = ({ resource, current }) => {
  const { isAtLimit, maxProducts, maxSellers, maxStores } = usePlanLimits();

  if (!isAtLimit(resource, current)) return null;

  const limit = resource === 'products' ? maxProducts : resource === 'sellers' ? maxSellers : maxStores;

  return (
    <div className="p-3 rounded-lg border border-warning/30 bg-warning/10 flex items-center gap-3 text-sm">
      <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
      <span className="text-foreground flex-1">
        Limite atingido: <strong>{current}/{limit} {resourceLabels[resource]}</strong>.{' '}
        <Link to="/app/assinatura" className="text-primary font-semibold hover:underline inline-flex items-center gap-1">
          <Crown className="w-3 h-3" /> Fazer upgrade
        </Link>
      </span>
    </div>
  );
};

export default LimitWarning;
