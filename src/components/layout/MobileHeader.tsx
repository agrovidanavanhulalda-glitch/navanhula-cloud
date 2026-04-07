import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import NetworkIndicator from './NetworkIndicator';
import NotificationBell from './NotificationBell';
import LanguageSelector from './LanguageSelector';

const pageTitles: Record<string, string> = {
  '/app/dashboard': 'NAVANHULA',
  '/app/pdv': 'Vendas',
  '/app/crm': 'Clientes',
  '/app/relatorios': 'Relatórios',
  '/app/produtos': 'Produtos',
  '/app/caixa': 'Caixa',
  '/app/inventario': 'Inventário',
  '/app/historico': 'Histórico',
  '/app/configuracoes': 'Configurações',
  '/app/lojas': 'Lojas',
  '/app/vendedores': 'Vendedores',
  '/app/financeiro-rh': 'Financeiro & RH',
  '/app/fiscal': 'Fiscal',
  '/app/carteira': 'Carteira',
  '/app/fornecedores': 'Fornecedores',
  '/app/contabilidade': 'Contabilidade',
  '/app/bi': 'Business Intelligence',
  '/app/comunidade': 'Comunidade',
  '/app/documentos': 'Documentos',
};

// Main tabs that don't show back button
const mainRoutes = ['/app/dashboard', '/app/pdv', '/app/crm', '/app/relatorios'];

function getTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  // Check prefix
  for (const [key, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(key + '/')) return title;
  }
  return 'NAVANHULA';
}

function isMainRoute(pathname: string): boolean {
  return mainRoutes.includes(pathname);
}

const MobileHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMain = isMainRoute(location.pathname);
  const title = getTitle(location.pathname);

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-4 py-2.5 border-b border-border safe-top"
      style={{
        background: 'hsla(0, 0%, 100%, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isMain ? (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <ShoppingCart className="w-4 h-4 text-white" />
          </div>
        ) : (
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-foreground active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <span className="font-bold text-sm tracking-tight text-foreground truncate">
          {title}
        </span>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <LanguageSelector />
        <NotificationBell />
        <NetworkIndicator />
      </div>
    </header>
  );
};

export default MobileHeader;
