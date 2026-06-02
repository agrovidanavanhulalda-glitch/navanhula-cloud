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
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/i18n';
import { Button } from '@/components/ui/button';

import { LogOut, User, Building2, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import BrandLogo from '@/components/brand/BrandLogo';
import SmartOnboarding from '@/components/onboarding/SmartOnboarding';
import WhatsAppFloat from '../public/landing/WhatsAppFloat';

const MainLayout: React.FC = () => {
  const isMobile = useIsMobile();
  const { user, company, signOut, role, loading } = useAuth();
  const { t } = useI18n();


  const handleLogout = async () => {
    await signOut();
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col w-full max-w-full overflow-x-hidden">
        <MobileHeader />
        <UpsellBanner />

        <main className="flex-1 p-4 pb-[100px] safe-bottom overflow-y-auto overflow-x-hidden w-full max-w-full animate-fade-in">
          <SmartOnboarding />
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
          {/* Enhanced top bar — Unified Header */}
          <header className="sticky top-0 z-50 flex items-center justify-between px-6 h-16 border-b border-border/60 bg-background/80 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground transition-colors" />
              <div className="h-5 w-px bg-border/60" />
              <BrandLogo width={140} priority />
            </div>

            {/* Active Company - Center */}
            <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/50 border border-border/40">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm text-foreground truncate max-w-[200px]">
                {company?.name || (loading ? t('common.loading') : 'Navanhula Cloud')}
              </span>
            </div>

            {/* User Profile + Logout - Right */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 mr-2">
                <LanguageSelector />
                <NotificationBell />
                <NetworkIndicator />
              </div>

              <div className="h-8 w-px bg-border/60" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 flex items-center gap-2 pl-2 pr-3 hover:bg-secondary/80 rounded-full transition-all">
                    <Avatar className="h-8 w-8 border border-border/50">
                      <AvatarImage src={user?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {(user?.email || 'US').substring(0, 2).toUpperCase()}

                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left">
                      <span className="text-xs font-bold leading-tight truncate max-w-[100px]">
                        {user?.full_name || user?.email?.split('@')[0]}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight capitalize">
                        {role || t('common.confirm')}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-1 animate-in fade-in-0 zoom-in-95">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.full_name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer gap-2">
                    <User className="w-4 h-4" />
                    <span>Meu Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10" 
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('auth.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <UpsellBanner />
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <SmartOnboarding />
              <Outlet />
            </div>
          </main>
          <Footer />
        </div>
        <WhatsAppFloat />
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;
