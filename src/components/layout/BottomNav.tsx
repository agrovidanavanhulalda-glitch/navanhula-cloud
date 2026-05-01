import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users, BarChart3, Menu, Package, Boxes } from 'lucide-react';
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
  { label: 'Início', icon: LayoutDashboard, path: '/app/dashboard' },
  { label: 'Vendas', icon: ShoppingCart, path: '/app/pdv' },
  { label: 'Produtos', icon: Package, path: '/app/produtos' },
  { label: 'Stock', icon: Boxes, path: '/app/estoque' },
  { label: 'Menu', icon: Menu, path: '', isMenu: true },
];

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const isActive = (path: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 safe-bottom"
      style={{
        background: 'hsl(var(--background) / 0.85)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      }}
    >
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          if (item.isMenu) {
            return (
              <Sheet key={item.label} open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <button className="flex flex-col items-center justify-center gap-1 flex-1 min-w-0 py-1.5 text-muted-foreground active:scale-95 transition-transform">
                    <item.icon className="w-6 h-6" strokeWidth={1.8} />
                    <span className="text-[11px] font-bold uppercase tracking-tighter">{item.label}</span>
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
                "flex flex-col items-center justify-center gap-1 flex-1 min-w-0 py-1.5 transition-colors duration-150 active:scale-95",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-6 h-6" strokeWidth={active ? 2.5 : 1.8} />
              <span className={cn("text-[11px] uppercase tracking-tighter", active ? "font-black" : "font-bold")}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
