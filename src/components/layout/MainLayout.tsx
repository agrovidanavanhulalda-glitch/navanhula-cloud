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
      <div className="min-h-screen bg-background flex flex-col">
        {/* Mobile header — sticky so content scrolls beneath */}
        <header
          className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card border-b border-border safe-top"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        >
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SidebarProvider>
                <Sidebar />
              </SidebarProvider>
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--gradient-primary)' }}>
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-foreground">NAVANHULA CLOUD</span>
          </div>
          
          <div className="flex items-center gap-1">
            <LanguageSelector />
            <NotificationBell />
            <NetworkIndicator />
          </div>
        </header>

        {/* Mobile breadcrumb */}
        <div className="px-4 py-2 border-b border-border bg-card">
          <AppBreadcrumb />
        </div>

        <UpsellBanner />

        {/* Mobile content — proper padding, no overlap */}
        <main className="flex-1 p-4 pb-6 safe-bottom overflow-auto">
          <Outlet />
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Desktop top bar */}
          <header
            className="sticky top-0 z-50 flex items-center gap-4 px-6 py-2.5 border-b border-border bg-card"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          >
            <SidebarTrigger className="-ml-2" />
            <div className="flex-1">
              <AppBreadcrumb />
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <NotificationBell />
              <NetworkIndicator />
            </div>
          </header>
          <UpsellBanner />
          <main className="flex-1 overflow-auto bg-background">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;
