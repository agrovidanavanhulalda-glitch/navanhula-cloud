import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import NetworkIndicator from './NetworkIndicator';
import NotificationBell from './NotificationBell';
import BrandLogo from '@/components/brand/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';

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
  const { company } = useAuth();
  const isMain = mainRoutes.includes(location.pathname);
  const title = getTitle(location.pathname);

  return (
    <header
      className="sticky top-0 z-50 flex items-center px-4 h-14 border-b border-border/60 safe-top"
      style={{
        background: 'hsl(var(--background) / 0.85)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {!isMain && (
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-foreground active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <BrandLogo width={100} priority />
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
        <span className="font-black text-sm tracking-tight text-foreground truncate max-w-[140px] uppercase">
          {company?.name || 'Navanhula'}
        </span>
        <span className="text-[10px] text-primary font-bold uppercase tracking-[0.2em]">
          {title}
        </span>
      </div>

      <div className="flex items-center gap-0.5 flex-shrink-0 flex-1 justify-end">
        <NotificationBell />
        <NetworkIndicator />
      </div>
    </header>
  );
};

export default MobileHeader;
