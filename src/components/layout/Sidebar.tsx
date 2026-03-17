import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { useLocalPOS } from '@/contexts/LocalPOSContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ShoppingCart, Package, Settings, Store, LogOut,
  WalletCards, History, BarChart3, TrendingUp, Boxes, Shield, User,
  MessageSquare, Users, UserPlus, Link2, Wallet, FileText, BookOpen,
  UserCheck, Truck, PieChart, Sprout, Egg,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import NetworkIndicator from './NetworkIndicator';
import NotificationBell from './NotificationBell';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

interface NavSection {
  title?: string;
  items: NavItem[];
  roles?: string[];
}

const navSections: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/app/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: 'Painel CEO', href: '/app/ceo', icon: <TrendingUp className="w-5 h-5" />, roles: ['admin', 'ceo'] },
    ],
  },
  {
    title: 'Vendas',
    items: [
      { label: 'PDV', href: '/app/pdv', icon: <ShoppingCart className="w-5 h-5" /> },
      { label: 'Caixa', href: '/app/caixa', icon: <WalletCards className="w-5 h-5" /> },
      { label: 'Histórico', href: '/app/vendas', icon: <History className="w-5 h-5" /> },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { label: 'Produtos', href: '/app/produtos', icon: <Package className="w-5 h-5" /> },
      { label: 'Estoque', href: '/app/estoque', icon: <Boxes className="w-5 h-5" />, roles: ['admin', 'manager', 'ceo'] },
    ],
  },
  {
    title: 'CRM & Equipa',
    roles: ['admin', 'manager', 'ceo'],
    items: [
      { label: 'Clientes', href: '/app/crm', icon: <UserCheck className="w-5 h-5" />, roles: ['admin', 'manager', 'ceo'] },
      { label: 'Vendedores', href: '/app/vendedores', icon: <Users className="w-5 h-5" />, roles: ['admin', 'manager', 'ceo'] },
      { label: 'Fornecedores', href: '/app/fornecedores', icon: <Truck className="w-5 h-5" />, roles: ['admin', 'manager', 'ceo'] },
    ],
  },
  {
    title: 'Financeiro',
    roles: ['admin', 'manager', 'ceo'],
    items: [
      { label: 'Relatórios', href: '/app/relatorios', icon: <BarChart3 className="w-5 h-5" />, roles: ['admin', 'manager', 'ceo'] },
      { label: 'Financeiro', href: '/app/financeiro', icon: <TrendingUp className="w-5 h-5" />, roles: ['admin', 'manager', 'ceo'] },
      { label: 'Contabilidade', href: '/app/contabilidade', icon: <BookOpen className="w-5 h-5" />, roles: ['admin', 'ceo'] },
      { label: 'Fiscal', href: '/app/fiscal', icon: <FileText className="w-5 h-5" />, roles: ['admin', 'manager', 'ceo'] },
      { label: 'Carteira', href: '/app/carteira', icon: <WalletCards className="w-5 h-5" />, roles: ['admin', 'manager', 'ceo'] },
      { label: 'BI Analytics', href: '/app/bi', icon: <PieChart className="w-5 h-5" />, roles: ['admin', 'ceo'] },
      { label: 'AI Engine', href: '/app/ai', icon: <Brain className="w-5 h-5" />, roles: ['admin', 'manager', 'ceo'] },
    ],
  },
  {
    title: 'Operações',
    roles: ['admin', 'ceo'],
    items: [
      { label: 'Lojas', href: '/app/lojas', icon: <Store className="w-5 h-5" />, roles: ['admin', 'ceo'] },
      { label: 'Agricultura', href: '/app/agricultura', icon: <Sprout className="w-5 h-5" />, roles: ['admin', 'ceo'] },
      { label: 'Avicultura', href: '/app/avicultura', icon: <Egg className="w-5 h-5" />, roles: ['admin', 'ceo'] },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { label: 'Assinatura', href: '/app/assinatura', icon: <Shield className="w-5 h-5" />, roles: ['admin', 'ceo'] },
      { label: 'Configurações', href: '/app/configuracoes', icon: <Settings className="w-5 h-5" />, roles: ['admin', 'ceo'] },
      { label: 'Comunidade', href: '/app/comunidade', icon: <MessageSquare className="w-5 h-5" /> },
    ],
  },
];

const adminResellerNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/app/revendedores/dashboard', icon: <Users className="w-5 h-5" /> },
  { label: 'Cadastrar', href: '/app/revendedores/cadastrar', icon: <UserPlus className="w-5 h-5" /> },
  { label: 'Lista', href: '/app/revendedores/lista', icon: <Users className="w-5 h-5" /> },
  { label: 'Comissões', href: '/app/revendedores/comissoes', icon: <TrendingUp className="w-5 h-5" /> },
  { label: 'Pagamentos', href: '/app/revendedores/pagamentos', icon: <Wallet className="w-5 h-5" /> },
  { label: 'Links', href: '/app/revendedores/links', icon: <Link2 className="w-5 h-5" /> },
  { label: 'Performance', href: '/app/revendedores/performance', icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'Materiais', href: '/app/revendedores/materiais', icon: <FileText className="w-5 h-5" /> },
];

const resellerPortalNavItems: NavItem[] = [
  { label: 'Meu Painel', href: '/app/revendedores/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Clientes Indicados', href: '/app/revendedores/lista', icon: <Users className="w-5 h-5" /> },
  { label: 'Comissões', href: '/app/revendedores/comissoes', icon: <TrendingUp className="w-5 h-5" /> },
  { label: 'Pagamentos', href: '/app/revendedores/pagamentos', icon: <Wallet className="w-5 h-5" /> },
  { label: 'Links', href: '/app/revendedores/links', icon: <Link2 className="w-5 h-5" /> },
  { label: 'Materiais', href: '/app/revendedores/materiais', icon: <FileText className="w-5 h-5" /> },
  { label: 'Performance', href: '/app/revendedores/performance', icon: <BarChart3 className="w-5 h-5" /> },
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
  const rawName = currentCashRegister?.sellerName || user?.full_name || '';
  const currentOperator = rawName && !/^[0-9a-f-]{36}$/i.test(rawName) ? rawName : 'Operador';
  const currentOperatorRole =
    role === 'reseller' ? 'Revendedor' :
    role === 'ceo' ? 'CEO' :
    role === 'manager' ? 'Gerente' :
    isBackofficeAdmin ? 'Administrador' : 'Vendedor';

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
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-[hsl(217_91%_53%/0.15)] text-[hsl(0_0%_100%)] font-semibold'
            : 'text-[hsl(214_32%_80%)] hover:bg-[hsl(217_91%_53%/0.08)] hover:text-[hsl(214_32%_91%)]',
          collapsed && 'justify-center px-2'
        )}
      >
        <span className={cn('flex-shrink-0 transition-colors duration-200', isActive ? 'text-primary' : '')}>
          {item.icon}
        </span>
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        {!collapsed && isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
      </Link>
    );
  };

  const renderSections = () => {
    if (isReseller) {
      return resellerPortalNavItems.map(renderNavItem);
    }

    return navSections.map((section, idx) => {
      // Filter section by role
      if (section.roles && !section.roles.includes(role || 'seller')) return null;
      const visibleItems = section.items.filter(item => !item.roles || item.roles.includes(role || 'seller'));
      if (visibleItems.length === 0) return null;

      return (
        <div key={idx} className={idx > 0 ? 'pt-3' : ''}>
          {section.title && !collapsed && (
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: 'hsl(215 16% 45%)' }}>
              {section.title}
            </p>
          )}
          {collapsed && idx > 0 && (
            <div className="mx-3 mb-2 border-t" style={{ borderColor: 'hsl(217 33% 18%)' }} />
          )}
          <div className="space-y-0.5">{visibleItems.map(renderNavItem)}</div>
        </div>
      );
    });
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
      style={{ backgroundColor: 'hsl(222 47% 11%)', borderColor: 'hsl(217 33% 18%)' }}
    >
      {/* Brand */}
      <div className={cn('flex items-center gap-3 p-4 border-b', collapsed && 'justify-center')}
        style={{ borderColor: 'hsl(217 33% 18%)' }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--gradient-primary)' }}>
          <ShoppingCart className="w-4.5 h-4.5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-bold text-base text-white tracking-tight">NAVANHULA</h1>
            <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: 'hsl(215 16% 55%)' }}>CLOUD</p>
          </div>
        )}
      </div>

      {/* Status bar */}
      {!collapsed && (
        <div className="px-4 py-2 border-b flex items-center justify-between"
          style={{ borderColor: 'hsl(217 33% 18%)' }}>
          <NetworkIndicator />
          <NotificationBell />
        </div>
      )}

      {/* Company & Store */}
      {!collapsed && (company || store || isReseller) && (
        <div className="px-4 py-3 border-b space-y-1.5"
          style={{ borderColor: 'hsl(217 33% 18%)' }}>
          {company && (
            <div className="flex items-center gap-2 text-sm">
              <Store className="w-4 h-4 text-primary" />
              <span className="text-white truncate font-medium text-xs">{company.name}</span>
            </div>
          )}
          {store && !isReseller && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(215 16% 55%)' }}>
              <Store className="w-3 h-3" />
              <span className="truncate">{store.name}</span>
            </div>
          )}
          {isReseller && !company && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(215 16% 55%)' }}>
              <Users className="w-3 h-3 text-primary" />
              <span className="truncate">Rede comercial NAVANHULA CLOUD</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto space-y-0.5">
        {renderSections()}

        {/* Reseller admin section */}
        {!isReseller && isBackofficeAdmin && adminResellerNavItems.length > 0 && (
          <div className="pt-3">
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: 'hsl(215 16% 45%)' }}>
                Revendedores
              </p>
            )}
            <div className="space-y-0.5">{adminResellerNavItems.map(renderNavItem)}</div>
          </div>
        )}
      </nav>

      {/* User section */}
      <div className={cn('p-3 border-t', collapsed && 'p-2')}
        style={{ borderColor: 'hsl(217 33% 18%)' }}>
        {!collapsed && (
          <div className="mb-2 p-3 rounded-lg" style={{ backgroundColor: 'hsl(217 33% 15%)' }}>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'hsl(217 91% 53% / 0.15)' }}>
                {isBackofficeAdmin
                  ? <Shield className="w-3.5 h-3.5 text-primary" />
                  : <User className="w-3.5 h-3.5" style={{ color: 'hsl(215 16% 55%)' }} />}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-xs text-white truncate">{currentOperator}</p>
                <p className="text-[10px]" style={{ color: 'hsl(215 16% 55%)' }}>{currentOperatorRole}</p>
              </div>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-3 text-xs hover:text-destructive hover:bg-destructive/10',
            collapsed && 'justify-center px-2'
          )}
          style={{ color: 'hsl(215 16% 55%)' }}
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && 'Sair'}
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
