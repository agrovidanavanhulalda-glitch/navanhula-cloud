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
  Wallet,
  WalletCards,
  Users,
  BarChart3,
  TrendingUp,
  Boxes,
  Building2,
  Shield,
  User,
  History,
  CreditCard,
  Crown,
  Calculator,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import NetworkIndicator from './NetworkIndicator';
import NotificationBell from './NotificationBell';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly: boolean;
  ceoOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="w-5 h-5" />, adminOnly: false },
  { label: 'Painel CEO', href: '/ceo', icon: <Crown className="w-5 h-5" />, adminOnly: true, ceoOnly: true },
  { label: 'PDV', href: '/pdv', icon: <ShoppingCart className="w-5 h-5" />, adminOnly: false },
  { label: 'Caixa', href: '/caixa', icon: <Wallet className="w-5 h-5" />, adminOnly: false },
  { label: 'Histórico', href: '/historico', icon: <History className="w-5 h-5" />, adminOnly: false },
  { label: 'Produtos', href: '/produtos', icon: <Package className="w-5 h-5" />, adminOnly: true },
  { label: 'Estoque', href: '/estoque', icon: <Boxes className="w-5 h-5" />, adminOnly: true },
  { label: 'Vendedores', href: '/vendedores', icon: <Users className="w-5 h-5" />, adminOnly: true },
  { label: 'Lojas', href: '/lojas', icon: <Store className="w-5 h-5" />, adminOnly: true },
  { label: 'Relatórios', href: '/relatorios', icon: <BarChart3 className="w-5 h-5" />, adminOnly: true },
  { label: 'Fiscal', href: '/fiscal', icon: <Calculator className="w-5 h-5" />, adminOnly: true },
  { label: 'Financeiro', href: '/financeiro', icon: <TrendingUp className="w-5 h-5" />, adminOnly: true },
  { label: 'Carteira', href: '/carteira', icon: <WalletCards className="w-5 h-5" />, adminOnly: false },
  { label: 'Configurações', href: '/configuracoes', icon: <Settings className="w-5 h-5" />, adminOnly: true },
  { label: 'Comunidade', href: '/comunidade', icon: <MessageSquare className="w-5 h-5" />, adminOnly: false },
  { label: 'Assinatura', href: '/assinatura', icon: <CreditCard className="w-5 h-5" />, adminOnly: true },
];

interface SidebarProps {
  collapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, company, store, signOut, role } = useAuth();
  const { currentCashRegister } = useLocalPOS();

  // Determine if current user is admin based on local seller context
  // For now, use the SaaS role or assume admin if no specific role
  const isAdmin = role === 'admin' || role === 'manager' || (role as string) === 'ceo';
  const isCEO = (role as string) === 'ceo' || role === 'admin';
  // Get current operator name from cash register
  const currentOperator = currentCashRegister?.sellerName || user?.full_name || 'Operador';
  const currentOperatorRole = (role as string) === 'ceo' ? 'CEO' :
                              currentCashRegister?.sellerId?.includes('admin') ? 'Administrador' : 
                              isAdmin ? 'Administrador' : 'Vendedor';

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Filter nav items based on role
  const visibleNavItems = navItems.filter(item => {
    if (item.ceoOnly && !isCEO) return false;
    if (!item.adminOnly) return true;
    return isAdmin;
  });

  return (
    <aside className={cn(
      "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 p-4 border-b border-sidebar-border",
        collapsed && "justify-center"
      )}>
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <ShoppingCart className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-bold text-lg text-sidebar-foreground">NAVANHULA</h1>
            <p className="text-xs text-muted-foreground">POS System</p>
          </div>
        )}
      </div>

      {/* Network Status */}
      {!collapsed && (
        <div className="px-4 py-2 border-b border-sidebar-border flex items-center justify-between">
          <NetworkIndicator />
          <NotificationBell />
        </div>
      )}

      {/* Company and Store indicator */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-sidebar-border space-y-2">
          {company && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sidebar-foreground truncate font-medium">{company.name}</span>
            </div>
          )}
          {store && (
            <div className="flex items-center gap-2 text-xs">
              <Store className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground truncate">{store.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation - ROLE-BASED VISIBILITY */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              {item.icon}
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4" />}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className={cn('p-4 border-t border-sidebar-border', collapsed && 'p-2')}>
        {!collapsed && (
          <div className="mb-3 p-3 rounded-lg bg-sidebar-accent">
            <div className="flex items-center gap-2 mb-1">
              {isAdmin ? (
                <Shield className="w-4 h-4 text-primary" />
              ) : (
                <User className="w-4 h-4 text-muted-foreground" />
              )}
              <p className="font-medium text-sm text-sidebar-accent-foreground truncate">
                {currentOperator}
              </p>
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
