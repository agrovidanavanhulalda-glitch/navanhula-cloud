import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { useLocalPOS } from '@/contexts/LocalPOSContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Settings,
  Store,
  LogOut,
  ChevronRight,
  WalletCards,
  History,
  BarChart3,
  TrendingUp,
  Boxes,
  Shield,
  User,
  MessageSquare,
  Users,
  UserPlus,
  Link2,
  Wallet,
  FileText,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import NetworkIndicator from './NetworkIndicator';
import NotificationBell from './NotificationBell';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

// All nav items with role restrictions
// roles: undefined = visible to all, otherwise array of allowed roles
interface NavItemWithRole extends NavItem {
  roles?: string[];
}

const allNavItems: NavItemWithRole[] = [
  { label: 'Dashboard', href: '/app/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Painel CEO', href: '/app/ceo', icon: <TrendingUp className="w-5 h-5" />, roles: ['admin', 'ceo'] },
  { label: 'PDV', href: '/app/pdv', icon: <ShoppingCart className="w-5 h-5" /> },
  { label: 'Caixa', href: '/app/caixa', icon: <WalletCards className="w-5 h-5" /> },
  { label: 'Vendas', href: '/app/vendas', icon: <History className="w-5 h-5" /> },
  { label: 'Produtos', href: '/app/produtos', icon: <Package className="w-5 h-5" /> },
  { label: 'Estoque', href: '/app/estoque', icon: <Boxes className="w-5 h-5" />, roles: ['admin', 'manager', 'ceo'] },
  { label: 'Vendedores', href: '/app/vendedores', icon: <Users className="w-5 h-5" />, roles: ['admin', 'manager', 'ceo'] },
  { label: 'Lojas', href: '/app/lojas', icon: <Store className="w-5 h-5" />, roles: ['admin', 'ceo'] },
  { label: 'Relatórios', href: '/app/relatorios', icon: <BarChart3 className="w-5 h-5" />, roles: ['admin', 'manager', 'ceo'] },
  { label: 'Fiscal', href: '/app/fiscal', icon: <FileText className="w-5 h-5" />, roles: ['admin', 'manager', 'ceo'] },
  { label: 'Financeiro', href: '/app/financeiro', icon: <TrendingUp className="w-5 h-5" />, roles: ['admin', 'manager', 'ceo'] },
  { label: 'Contabilidade', href: '/app/contabilidade', icon: <BookOpen className="w-5 h-5" />, roles: ['admin', 'ceo'] },
  { label: 'Carteira', href: '/app/carteira', icon: <WalletCards className="w-5 h-5" />, roles: ['admin', 'manager', 'ceo'] },
  { label: 'Assinatura', href: '/app/assinatura', icon: <Shield className="w-5 h-5" />, roles: ['admin', 'ceo'] },
  { label: 'Configurações', href: '/app/configuracoes', icon: <Settings className="w-5 h-5" />, roles: ['admin', 'ceo'] },
  { label: 'Comunidade', href: '/app/comunidade', icon: <MessageSquare className="w-5 h-5" /> },
];

const adminResellerNavItems: NavItem[] = [
  { label: 'Dashboard de Revendedores', href: '/app/revendedores/dashboard', icon: <Users className="w-5 h-5" /> },
  { label: 'Cadastrar Revendedor', href: '/app/revendedores/cadastrar', icon: <UserPlus className="w-5 h-5" /> },
  { label: 'Lista de Revendedores', href: '/app/revendedores/lista', icon: <Users className="w-5 h-5" /> },
  { label: 'Comissões', href: '/app/revendedores/comissoes', icon: <TrendingUp className="w-5 h-5" /> },
  { label: 'Pagamentos', href: '/app/revendedores/pagamentos', icon: <Wallet className="w-5 h-5" /> },
  { label: 'Links de Convite', href: '/app/revendedores/links', icon: <Link2 className="w-5 h-5" /> },
  { label: 'Relatórios de Performance', href: '/app/revendedores/performance', icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'Materiais de Venda', href: '/app/revendedores/materiais', icon: <FileText className="w-5 h-5" /> },
];

const resellerPortalNavItems: NavItem[] = [
  { label: 'Meu Painel', href: '/app/revendedores/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Clientes Indicados', href: '/app/revendedores/lista', icon: <Users className="w-5 h-5" /> },
  { label: 'Comissões', href: '/app/revendedores/comissoes', icon: <TrendingUp className="w-5 h-5" /> },
  { label: 'Pagamentos', href: '/app/revendedores/pagamentos', icon: <Wallet className="w-5 h-5" /> },
  { label: 'Links de Convite', href: '/app/revendedores/links', icon: <Link2 className="w-5 h-5" /> },
  { label: 'Materiais de Venda', href: '/app/revendedores/materiais', icon: <FileText className="w-5 h-5" /> },
  { label: 'Relatórios de Performance', href: '/app/revendedores/performance', icon: <BarChart3 className="w-5 h-5" /> },
];

interface SidebarProps {
  collapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, company, store, signOut, role } = useAuth();
  const { currentCashRegister } = useLocalPOS();

  const isBackofficeAdmin = role === 'admin' || role === 'manager' || role === 'ceo';
  const isReseller = role === 'reseller';
  const mainNavItems = isReseller ? resellerPortalNavItems : primaryNavItems;
  const resellerSectionItems = !isReseller && isBackofficeAdmin ? adminResellerNavItems : [];
  const rawName = currentCashRegister?.sellerName || user?.full_name || '';
  const currentOperator = rawName && !/^[0-9a-f-]{36}$/i.test(rawName) ? rawName : 'Operador';
  const currentOperatorRole =
    role === 'reseller'
      ? 'Revendedor'
      : role === 'ceo'
        ? 'CEO'
        : role === 'manager'
          ? 'Gerente'
          : isBackofficeAdmin
            ? 'Administrador'
            : 'Vendedor';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);

    return (
      <Link
        key={item.href}
        to={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          collapsed && 'justify-center px-2'
        )}
      >
        {item.icon}
        {!collapsed && (
          <>
            <span className="flex-1 text-sm">{item.label}</span>
            {isActive && <ChevronRight className="w-4 h-4" />}
          </>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className={cn('flex items-center gap-3 p-4 border-b border-sidebar-border', collapsed && 'justify-center')}>
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <ShoppingCart className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-bold text-lg text-sidebar-foreground">NAVANHULA POS</h1>
            <p className="text-xs text-muted-foreground">{isReseller ? 'Área do revendedor' : 'Área privada do cliente'}</p>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-4 py-2 border-b border-sidebar-border flex items-center justify-between">
          <NetworkIndicator />
          <NotificationBell />
        </div>
      )}

      {!collapsed && (company || store || isReseller) && (
        <div className="px-4 py-3 border-b border-sidebar-border space-y-2">
          {company && (
            <div className="flex items-center gap-2 text-sm">
              <Store className="w-4 h-4 text-primary" />
              <span className="text-sidebar-foreground truncate font-medium">{company.name}</span>
            </div>
          )}
          {store && !isReseller && (
            <div className="flex items-center gap-2 text-xs">
              <Store className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground truncate">{store.name}</span>
            </div>
          )}
          {isReseller && !company && (
            <div className="flex items-center gap-2 text-xs">
              <Users className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground truncate">Rede comercial NAVANHULA POS</span>
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 p-2 overflow-y-auto">
        <div className="space-y-1">{mainNavItems.map(renderNavItem)}</div>

        {resellerSectionItems.length > 0 && (
          <div className="pt-4">
            {!collapsed && (
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Rede de Revendedores
              </p>
            )}
            <div className="space-y-1">{resellerSectionItems.map(renderNavItem)}</div>
          </div>
        )}
      </nav>

      <div className={cn('p-4 border-t border-sidebar-border', collapsed && 'p-2')}>
        {!collapsed && (
          <div className="mb-3 p-3 rounded-lg bg-sidebar-accent">
            <div className="flex items-center gap-2 mb-1">
              {isBackofficeAdmin ? <Shield className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-muted-foreground" />}
              <p className="font-medium text-sm text-sidebar-accent-foreground truncate">{currentOperator}</p>
            </div>
            <p className="text-xs text-muted-foreground">{currentOperatorRole}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-3 text-muted-foreground hover:text-destructive',
            collapsed && 'justify-center px-2'
          )}
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && 'Sair'}
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;

