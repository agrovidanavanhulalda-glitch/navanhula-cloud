import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, ShoppingCart } from 'lucide-react';
import NetworkIndicator from './NetworkIndicator';
import NotificationBell from './NotificationBell';
import LanguageSelector from './LanguageSelector';

const MainLayout: React.FC = () => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card border-b border-border safe-top"
          style={{ boxShadow: 'var(--shadow-sm)' }}>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar />
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--gradient-primary)' }}>
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">NAVANHULA</span>
          </div>
          
          <div className="flex items-center gap-1">
            <LanguageSelector />
            <NotificationBell />
            <NetworkIndicator />
          </div>
        </header>

        {/* Mobile content */}
        <main className="flex-1 p-4 safe-bottom overflow-auto">
          <Outlet />
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop top bar */}
        <header className="flex items-center justify-end gap-2 px-6 py-2.5 border-b border-border bg-card"
          style={{ boxShadow: 'var(--shadow-sm)' }}>
          <LanguageSelector />
          <NotificationBell />
          <NetworkIndicator />
        </header>
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;
