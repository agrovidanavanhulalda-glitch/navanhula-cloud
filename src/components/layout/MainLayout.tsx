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
import AppBreadcrumb from './AppBreadcrumb';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import UpsellBanner from '@/components/monetization/UpsellBanner';

const MainLayout: React.FC = () => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col w-full max-w-full overflow-x-hidden">
        {/* Mobile header — sticky so content scrolls beneath */}
        <header
          className="sticky top-0 z-50 flex items-center justify-between px-3 py-2.5 bg-card border-b border-border safe-top"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        >
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 overflow-y-auto bg-sidebar text-sidebar-foreground">
              <SidebarProvider defaultOpen={true} open={true}>
                <Sidebar forceExpanded />
              </SidebarProvider>
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--gradient-primary)' }}>
              <ShoppingCart className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-xs tracking-tight text-foreground truncate">NAVANHULA</span>
          </div>
          
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <LanguageSelector />
            <NotificationBell />
            <NetworkIndicator />
          </div>
        </header>

        {/* Mobile breadcrumb */}
        <div className="px-3 py-1.5 border-b border-border bg-card overflow-x-auto">
          <AppBreadcrumb />
        </div>

        <UpsellBanner />

        {/* Mobile content — proper padding, no overlap, vertical scroll only */}
        <main className="flex-1 p-3 pb-6 safe-bottom overflow-y-auto overflow-x-hidden w-full max-w-full">
          <Outlet />
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Desktop top bar */}
          <header
            className="sticky top-0 z-50 flex items-center gap-4 px-6 py-2.5 border-b border-border bg-card"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          >
            <SidebarTrigger className="-ml-2" />
            <div className="flex-1 min-w-0">
              <AppBreadcrumb />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <LanguageSelector />
              <NotificationBell />
              <NetworkIndicator />
            </div>
          </header>
          <UpsellBanner />
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;
