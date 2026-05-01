import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useIsMobile } from '@/hooks/use-mobile';
import AppBreadcrumb from './AppBreadcrumb';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import UpsellBanner from '@/components/monetization/UpsellBanner';
import BottomNav from './BottomNav';
import FloatingActionButton from './FloatingActionButton';
import MobileHeader from './MobileHeader';
import NetworkIndicator from './NetworkIndicator';
import NotificationBell from './NotificationBell';
import LanguageSelector from './LanguageSelector';

import BrandLogo from '@/components/brand/BrandLogo';

const MainLayout: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col w-full max-w-full overflow-x-hidden">
        <MobileHeader />
        <UpsellBanner />

        <main className="flex-1 p-4 pb-[100px] safe-bottom overflow-y-auto overflow-x-hidden w-full max-w-full animate-fade-in">
          <Outlet />
        </main>

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
          {/* Premium top bar — Stripe-style */}
          <header className="sticky top-0 z-50 flex items-center gap-4 px-6 h-14 border-b border-border/60 bg-background/80 backdrop-blur-xl">
            <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground transition-colors" />
            <div className="h-5 w-px bg-border/60" />
            <div className="flex items-center gap-3">
              <BrandLogo width={120} className="hidden lg:block" />
            </div>
            <div className="h-5 w-px bg-border/60 hidden lg:block" />
            <div className="flex-1 min-w-0">
              <AppBreadcrumb />
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
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
