import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLocalPOS } from '@/contexts/LocalPOSContext';
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

// 100% LOCAL - NO AUTH CONTEXT, NO ASYNC

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'PDV', href: '/pos', icon: <ShoppingCart className="w-5 h-5" /> },
  { label: 'Produtos', href: '/products', icon: <Package className="w-5 h-5" /> },
  { label: 'Caixa', href: '/cash-register', icon: <DollarSign className="w-5 h-5" /> },
  { label: 'Estoque', href: '/inventory', icon: <AlertTriangle className="w-5 h-5" /> },
  { label: 'Relatórios', href: '/reports', icon: <FileText className="w-5 h-5" /> },
  { label: 'Usuários', href: '/users', icon: <Users className="w-5 h-5" /> },
  { label: 'Lojas', href: '/stores', icon: <Store className="w-5 h-5" /> },
  { label: 'Configurações', href: '/settings', icon: <Settings className="w-5 h-5" /> },
];

interface SidebarProps {
  collapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, store } = useLocalPOS();

  // Handle logout - just navigate, no async
  const handleLogout = () => {
    navigate('/dashboard');
  };

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

      {/* Store indicator */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2 text-sm">
            <Store className="w-4 h-4 text-primary" />
            <span className="text-sidebar-foreground truncate">{store.name}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
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
            <p className="font-medium text-sm text-sidebar-accent-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
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
