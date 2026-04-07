import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import NetworkIndicator from './NetworkIndicator';
import NotificationBell from './NotificationBell';
import LanguageSelector from './LanguageSelector';
import AppBreadcrumb from './AppBreadcrumb';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import UpsellBanner from '@/components/monetization/UpsellBanner';
import BottomNav from './BottomNav';
import FloatingActionButton from './FloatingActionButton';

const MainLayout: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col w-full max-w-full overflow-x-hidden">
        {/* Mobile header — compact, premium */}
        <header
          className="sticky top-0 z-50 flex items-center justify-between px-4 py-2.5 border-b border-border safe-top"
          style={{
            background: 'hsla(0, 0%, 100%, 0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--gradient-primary)' }}>
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-foreground truncate">NAVANHULA</span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <LanguageSelector />
            <NotificationBell />
            <NetworkIndicator />
          </div>
        </header>

        <UpsellBanner />

        {/* Mobile content — padding bottom for bottom nav */}
        <main className="flex-1 p-4 pb-[100px] safe-bottom overflow-y-auto overflow-x-hidden w-full max-w-full">
          <Outlet />
        </main>

        {/* FAB + Bottom Navigation */}
        <FloatingActionButton />
        <BottomNav />
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
