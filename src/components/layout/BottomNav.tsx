import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users, BarChart3, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarProvider } from '@/components/ui/sidebar';
import Sidebar from './Sidebar';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  isMenu?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/app/dashboard' },
  { label: 'Vendas', icon: ShoppingCart, path: '/app/pdv' },
  { label: 'Clientes', icon: Users, path: '/app/crm' },
  { label: 'Relatórios', icon: BarChart3, path: '/app/relatorios' },
  { label: 'Mais', icon: Menu, path: '', isMenu: true },
];

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 60) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom transition-transform duration-300",
        !visible && "translate-y-full"
      )}
      style={{ boxShadow: '0 -2px 12px rgba(0,0,0,0.06)' }}
    >
      <div className="flex justify-around items-center h-[70px] max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          if (item.isMenu) {
            return (
              <Sheet key={item.label} open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <button className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 transition-colors text-muted-foreground">
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-[10px] font-medium truncate max-w-[56px]">{item.label}</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 overflow-y-auto bg-sidebar text-sidebar-foreground">
                  <SidebarProvider defaultOpen={true} open={true}>
                    <Sidebar forceExpanded />
                  </SidebarProvider>
                </SheetContent>
              </Sheet>
            );
          }

          const active = isActive(item.path);
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 transition-all duration-200 relative",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
              <item.icon className={cn("w-5 h-5 flex-shrink-0", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
              <span className={cn("text-[10px] truncate max-w-[56px]", active ? "font-semibold" : "font-medium")}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
