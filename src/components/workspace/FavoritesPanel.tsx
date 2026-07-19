import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAV_KEY = 'nava.workspace.favorites.v1';

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

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

interface FavoritesPanelProps {
  className?: string;
}

const FavoritesPanel: React.FC<FavoritesPanelProps> = ({ className }) => {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(readFavorites());
    const onStorage = (e: StorageEvent) => {
      if (e.key === FAV_KEY) setFavorites(readFavorites());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (favorites.length === 0) return null;

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
          <Star className="h-3.5 w-3.5 fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" />
        </span>
        <h3 className="text-sm font-semibold tracking-tight">Favoritos</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {favorites.map((href) => {
          const label = LABELS[href] ?? href.replace('/app/', '').replace(/-/g, ' ');
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                'border border-border/60 bg-secondary/40 hover:bg-secondary/70 hover:border-[hsl(var(--gold))]/40',
                'text-xs font-medium capitalize transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))]/40',
              )}
            >
              <Star className="h-3 w-3 fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default FavoritesPanel;
