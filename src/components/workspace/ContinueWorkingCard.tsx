import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const RECENT_KEY = 'nava.workspace.recents.v1';

const LABELS: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/pdv': 'PDV / POS',
  '/app/caixa': 'Caixa',
  '/app/vendas': 'Vendas',
  '/app/produtos': 'Produtos',
  '/app/estoque': 'Estoque',
  '/app/crm': 'Clientes',
  '/app/fornecedores': 'Fornecedores',
  '/app/relatorios': 'Relatórios',
  '/app/financeiro-rh': 'Financeiro / RH',
  '/app/relatorios-fiscais': 'Relatórios Fiscais',
  '/app/configuracoes': 'Configurações',
  '/app/equipa': 'Minha Equipa',
  '/app/lojas': 'Lojas',
};

function readRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

interface ContinueWorkingCardProps {
  className?: string;
  limit?: number;
}

const ContinueWorkingCard: React.FC<ContinueWorkingCardProps> = ({ className, limit = 4 }) => {
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    setRecents(readRecents().slice(0, limit));
  }, [limit]);

  if (recents.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4',
        'shadow-[0_1px_0_0_hsl(var(--border)/0.4),0_10px_30px_-24px_hsl(var(--primary)/0.35)]',
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex items-center justify-center h-7 w-7 rounded-full ring-1 ring-border/60"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--gold)/0.15))' }}
        >
          <Clock className="h-3.5 w-3.5 text-primary" />
        </span>
        <h3 className="text-sm font-semibold tracking-tight">Continuar de onde parou</h3>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {recents.map((href) => {
          const label = LABELS[href] ?? href.replace('/app/', '').replace(/-/g, ' ');
          return (
            <li key={href}>
              <Link
                to={href}
                className={cn(
                  'group flex items-center justify-between gap-2 px-3 py-2 rounded-lg',
                  'border border-border/50 bg-secondary/40 hover:bg-secondary/70 hover:border-[hsl(var(--gold))]/40',
                  'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))]/40',
                )}
              >
                <span className="text-sm font-medium capitalize truncate">{label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ContinueWorkingCard;
