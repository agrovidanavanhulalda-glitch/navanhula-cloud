import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, WalletCards, UserCheck, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ElementType;
  tone?: 'primary' | 'gold';
}

const DEFAULT_ACTIONS: QuickAction[] = [
  { label: 'Nova Venda', href: '/app/pdv', icon: ShoppingCart, tone: 'gold' },
  { label: 'Abrir Caixa', href: '/app/caixa', icon: WalletCards, tone: 'primary' },
  { label: 'Novo Produto', href: '/app/produtos', icon: Package, tone: 'primary' },
  { label: 'Novo Cliente', href: '/app/crm', icon: UserCheck, tone: 'primary' },
];

interface QuickActionsProps {
  className?: string;
  actions?: QuickAction[];
}

const QuickActions: React.FC<QuickActionsProps> = ({ className, actions = DEFAULT_ACTIONS }) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4',
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex items-center justify-center h-7 w-7 rounded-full ring-1 ring-border/60"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--gold)/0.15))' }}
        >
          <Plus className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
        </span>
        <h3 className="text-sm font-semibold tracking-tight">Ações rápidas</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {actions.map((a) => {
          const Icon = a.icon;
          const isGold = a.tone === 'gold';
          return (
            <Link
              key={a.label}
              to={a.href}
              aria-label={a.label}
              className={cn(
                'group flex flex-col items-start gap-2 px-3 py-3 rounded-xl border transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))]/40',
                isGold
                  ? 'border-[hsl(var(--gold))]/40 bg-[hsl(var(--gold))]/10 hover:bg-[hsl(var(--gold))]/15'
                  : 'border-border/60 bg-secondary/40 hover:bg-secondary/70 hover:border-[hsl(var(--gold))]/40',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 transition-transform group-hover:scale-110',
                  isGold ? 'text-[hsl(var(--gold))]' : 'text-primary',
                )}
              />
              <span className="text-xs font-semibold tracking-tight leading-tight">{a.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
export type { QuickAction };
