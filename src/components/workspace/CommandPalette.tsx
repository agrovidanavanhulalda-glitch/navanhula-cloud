import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard, ShoppingCart, Package, Boxes, UserCheck, BarChart3,
  Settings, WalletCards, History, TrendingUp, FileText, Star, Clock,
  Store, Users, Building2,
} from 'lucide-react';

interface WorkspaceItem {
  label: string;
  href: string;
  icon: React.ElementType;
  group: 'Navegação' | 'Ações rápidas';
  keywords?: string;
}

const ITEMS: WorkspaceItem[] = [
  { label: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard, group: 'Navegação', keywords: 'inicio home painel' },
  { label: 'PDV / POS', href: '/app/pdv', icon: ShoppingCart, group: 'Navegação', keywords: 'venda checkout caixa registro' },
  { label: 'Caixa', href: '/app/caixa', icon: WalletCards, group: 'Navegação', keywords: 'cash register' },
  { label: 'Vendas', href: '/app/vendas', icon: History, group: 'Navegação', keywords: 'historico sales' },
  { label: 'Produtos', href: '/app/produtos', icon: Package, group: 'Navegação', keywords: 'catalogo items produto' },
  { label: 'Estoque', href: '/app/estoque', icon: Boxes, group: 'Navegação', keywords: 'inventory stock inventario' },
  { label: 'Clientes (CRM)', href: '/app/crm', icon: UserCheck, group: 'Navegação', keywords: 'customer cliente' },
  { label: 'Fornecedores', href: '/app/fornecedores', icon: Building2, group: 'Navegação', keywords: 'suppliers' },
  { label: 'Relatórios', href: '/app/relatorios', icon: BarChart3, group: 'Navegação', keywords: 'reports analytics' },
  { label: 'Financeiro / RH', href: '/app/financeiro-rh', icon: TrendingUp, group: 'Navegação', keywords: 'finance salario' },
  { label: 'Relatórios Fiscais', href: '/app/relatorios-fiscais', icon: FileText, group: 'Navegação', keywords: 'iva fatura' },
  { label: 'Configurações', href: '/app/configuracoes', icon: Settings, group: 'Navegação', keywords: 'settings ajustes' },
  { label: 'Minha Equipa', href: '/app/equipa', icon: Users, group: 'Navegação', keywords: 'team users' },
  { label: 'Lojas', href: '/app/lojas', icon: Store, group: 'Navegação', keywords: 'stores branches filiais' },
  { label: 'Nova Venda', href: '/app/pdv', icon: ShoppingCart, group: 'Ações rápidas', keywords: 'new sale' },
  { label: 'Abrir Caixa', href: '/app/caixa', icon: WalletCards, group: 'Ações rápidas', keywords: 'open cash' },
  { label: 'Novo Produto', href: '/app/produtos', icon: Package, group: 'Ações rápidas', keywords: 'add product' },
];

const FAV_KEY = 'nava.workspace.favorites.v1';
const RECENT_KEY = 'nava.workspace.recents.v1';

function readStorage(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeStorage(key: string, value: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value.slice(0, 8)));
  } catch {
    /* noop */
  }
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [favorites, setFavorites] = useState<string[]>(() => readStorage(FAV_KEY));
  const [recents, setRecents] = useState<string[]>(() => readStorage(RECENT_KEY));

  useEffect(() => {
    if (!location.pathname.startsWith('/app')) return;
    setRecents((prev) => {
      const next = [location.pathname, ...prev.filter((p) => p !== location.pathname)].slice(0, 6);
      writeStorage(RECENT_KEY, next);
      return next;
    });
  }, [location.pathname]);

  const byHref = useMemo(() => {
    const map = new Map<string, WorkspaceItem>();
    for (const it of ITEMS) if (!map.has(it.href)) map.set(it.href, it);
    return map;
  }, []);

  const runNavigate = useCallback((href: string) => {
    onOpenChange(false);
    navigate(href);
  }, [navigate, onOpenChange]);

  const toggleFav = useCallback((href: string) => {
    setFavorites((prev) => {
      const next = prev.includes(href) ? prev.filter((h) => h !== href) : [href, ...prev].slice(0, 8);
      writeStorage(FAV_KEY, next);
      return next;
    });
  }, []);

  const favItems = favorites.map((h) => byHref.get(h)).filter((v): v is WorkspaceItem => !!v);
  const recentItems = recents.map((h) => byHref.get(h)).filter((v): v is WorkspaceItem => !!v);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Pesquisar páginas, ações... (Ctrl+K)" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>

        {favItems.length > 0 && (
          <CommandGroup heading="Favoritos">
            {favItems.map((it) => (
              <CommandItem
                key={`fav-${it.href}`}
                value={`fav ${it.label} ${it.keywords ?? ''}`}
                onSelect={() => runNavigate(it.href)}
              >
                <Star className="mr-2 h-4 w-4 text-[hsl(var(--gold))]" />
                <span>{it.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {recentItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recentes">
              {recentItems.map((it) => (
                <CommandItem
                  key={`recent-${it.href}`}
                  value={`recent ${it.label} ${it.keywords ?? ''}`}
                  onSelect={() => runNavigate(it.href)}
                >
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{it.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Navegação">
          {ITEMS.filter((i) => i.group === 'Navegação').map((it) => {
            const Icon = it.icon;
            const isFav = favorites.includes(it.href);
            return (
              <CommandItem
                key={it.href}
                value={`${it.label} ${it.keywords ?? ''}`}
                onSelect={() => runNavigate(it.href)}
              >
                <Icon className="mr-2 h-4 w-4 text-primary" />
                <span className="flex-1">{it.label}</span>
                <button
                  type="button"
                  aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  className="ml-2 p-1 rounded hover:bg-secondary/70"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFav(it.href);
                  }}
                >
                  <Star
                    className={`h-3.5 w-3.5 ${isFav ? 'fill-[hsl(var(--gold))] text-[hsl(var(--gold))]' : 'text-muted-foreground'}`}
                  />
                </button>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Ações rápidas">
          {ITEMS.filter((i) => i.group === 'Ações rápidas').map((it) => {
            const Icon = it.icon;
            return (
              <CommandItem
                key={`action-${it.label}`}
                value={`acao ${it.label} ${it.keywords ?? ''}`}
                onSelect={() => runNavigate(it.href)}
              >
                <Icon className="mr-2 h-4 w-4 text-[hsl(var(--gold))]" />
                <span>{it.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
