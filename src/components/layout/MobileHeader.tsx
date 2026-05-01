import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import NetworkIndicator from './NetworkIndicator';
import NotificationBell from './NotificationBell';
import BrandLogo from '@/components/brand/BrandLogo';

const pageTitles: Record<string, string> = {
  '/app/dashboard': 'NAVANHULA',
  '/app/pdv': 'Vendas',
  '/app/crm': 'Clientes',
  '/app/relatorios': 'Relatórios',
  '/app/produtos': 'Produtos',
  '/app/caixa': 'Caixa',
  '/app/estoque': 'Estoque',
  '/app/historico': 'Histórico',
  '/app/configuracoes': 'Configurações',
  '/app/lojas': 'Lojas',
  '/app/vendedores': 'Vendedores',
  '/app/financeiro-rh': 'Financeiro & RH',
  '/app/financeiro': 'Financeiro',
  '/app/fiscal': 'Fiscal',
  '/app/carteira': 'Carteira',
  '/app/fornecedores': 'Fornecedores',
  '/app/bi': 'Inteligência',
  '/app/comunidade': 'Comunidade',
  '/app/documentos': 'Documentos',
  '/app/vendas': 'Vendas',
  '/app/assinatura': 'Assinatura',
  '/app/ceo': 'CEO',
  '/app/equipa': 'Equipa',
  '/app/iam': 'Acessos',
};

const mainRoutes = ['/app/dashboard', '/app/pdv', '/app/crm', '/app/relatorios'];

function getTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  for (const [key, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(key + '/')) return title;
  }
  return 'NAVANHULA';
}

const MobileHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMain = mainRoutes.includes(location.pathname);
  const title = getTitle(location.pathname);

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-4 h-12 border-b border-border/60 safe-top"
      style={{
        background: 'hsl(var(--background) / 0.85)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {!isMain && (
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-foreground active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <BrandLogo width={90} priority />
        <span className="font-semibold text-[15px] tracking-tight text-foreground truncate">
          {title}
        </span>
      </div>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        <NotificationBell />
        <NetworkIndicator />
      </div>
    </header>
  );
};

export default MobileHeader;
