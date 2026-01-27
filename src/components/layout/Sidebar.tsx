import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Settings,
  Store,
  DollarSign,
  LogOut,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRoleLabel } from '@/lib/formatters';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'PDV', href: '/pos', icon: <ShoppingCart className="w-5 h-5" /> },
  { label: 'Produtos', href: '/products', icon: <Package className="w-5 h-5" />, roles: ['admin', 'manager'] },
  { label: 'Caixa', href: '/cash-register', icon: <DollarSign className="w-5 h-5" /> },
  { label: 'Estoque', href: '/inventory', icon: <AlertTriangle className="w-5 h-5" />, roles: ['admin', 'manager'] },
  { label: 'Relatórios', href: '/reports', icon: <FileText className="w-5 h-5" />, roles: ['admin', 'manager'] },
  { label: 'Usuários', href: '/users', icon: <Users className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Lojas', href: '/stores', icon: <Store className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Configurações', href: '/settings', icon: <Settings className="w-5 h-5" /> },
];

interface SidebarProps {
  collapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const location = useLocation();
  const { user, role, store, signOut } = useAuth();

  // Always show Dashboard + PDV + Caixa; restrict others by role only if role exists
  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true; // No restriction
    if (!role) return false; // Hide restricted items if role is unknown
    return item.roles.includes(role);
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

      {/* Store indicator – only if store is loaded */}
      {!collapsed && store?.name && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2 text-sm">
            <Store className="w-4 h-4 text-primary" />
            <span className="text-sidebar-foreground truncate">{store.name}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
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

      {/* User section – only render when user is available */}
      <div className={cn('p-4 border-t border-sidebar-border', collapsed && 'p-2')}>
        {!collapsed && user?.full_name && (
          <div className="mb-3 p-3 rounded-lg bg-sidebar-accent">
            <p className="font-medium text-sm text-sidebar-accent-foreground truncate">{user.full_name}</p>
            <p className="text-xs text-muted-foreground">{role ? getRoleLabel(role) : 'Carregando...'}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-3 text-muted-foreground hover:text-destructive',
            collapsed && 'justify-center px-2'
          )}
          onClick={signOut}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && 'Sair'}
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
