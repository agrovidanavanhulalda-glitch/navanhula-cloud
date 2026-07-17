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
import FounderBadge from '@/components/founder/FounderBadge';
import SimulationBanner from '@/components/founder/SimulationBanner';
import WorkspaceSearchButton from '@/components/workspace/WorkspaceSearchButton';

const MainLayout: React.FC = () => {
  const isMobile = useIsMobile();
  const { user, company, signOut, role, loading, isFounder } = useAuth();
  const { t } = useI18n();


  const handleLogout = async () => {
    await signOut();
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col w-full max-w-full overflow-x-hidden">
        <SimulationBanner />
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
          <SimulationBanner />
          {/* Enterprise Premium Header — Glass + Gold Rail */}
          <header
            className="sticky top-0 z-50 flex items-center justify-between px-6 h-16 border-b border-border/60 bg-background/70 backdrop-blur-xl backdrop-saturate-150 relative"
            style={{ boxShadow: '0 1px 0 0 hsl(var(--border) / 0.4), 0 8px 24px -20px hsl(var(--primary) / 0.25)' }}
          >
            {/* Bottom gold gradient rail */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.4) 20%, hsl(var(--gold) / 0.6) 50%, hsl(var(--primary) / 0.4) 80%, transparent 100%)',
              }}
            />

            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger
                aria-label="Alternar navegação"
                className="-ml-2 h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all"
              />
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
              <div className="transition-transform duration-300 hover:scale-[1.02]">
                <BrandLogo width={140} priority />
              </div>
            </div>

            {/* Active Company - Center */}
            <div className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
              <div
                className="group flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/50 bg-secondary/40 backdrop-blur-sm transition-all duration-300 hover:border-[hsl(var(--gold))]/40 hover:bg-secondary/70"
                style={{ boxShadow: 'inset 0 1px 0 0 hsl(0 0% 100% / 0.04)' }}
              >
                <span
                  className="flex items-center justify-center w-5 h-5 rounded-full ring-1 ring-border/60"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--gold) / 0.15))' }}
                >
                  <Building2 className="w-3 h-3 text-primary" />
                </span>
                <span className="font-semibold text-sm text-foreground truncate max-w-[220px] tracking-tight">
                  {company?.name || (loading ? t('common.loading') : 'Navanhula Cloud')}
                </span>
              </div>
              {isFounder && <FounderBadge />}
            </div>

            {/* User Profile + Logout - Right */}
            <div className="flex items-center gap-2">
              <WorkspaceSearchButton />
              <div className="flex items-center gap-0.5 mr-1">
                <LanguageSelector />
                <NotificationBell />
                <NetworkIndicator />
              </div>

              <div className="h-6 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    aria-label="Menu do utilizador"
                    className="relative h-11 flex items-center gap-2 pl-1.5 pr-3 hover:bg-secondary/70 rounded-full transition-all duration-200 group"
                  >
                    <Avatar
                      className="h-8 w-8 ring-2 ring-border/60 group-hover:ring-[hsl(var(--gold))]/40 transition-all"
                    >
                      <AvatarImage src={user?.avatar_url} />
                      <AvatarFallback
                        className="text-xs font-bold text-primary-foreground"
                        style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--gold)) 100%)' }}
                      >
                        {(user?.email || 'US').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col items-start text-left leading-tight">
                      <span className="text-xs font-bold truncate max-w-[110px]">
                        {user?.full_name || user?.email?.split('@')[0]}
                      </span>
                      <span className="text-[10px] text-muted-foreground capitalize tracking-wide">
                        {role || t('common.confirm')}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-60 mt-2 p-1.5 border-border/60 bg-popover/95 backdrop-blur-xl animate-in fade-in-0 zoom-in-95"
                  style={{ boxShadow: '0 20px 60px -12px hsl(var(--primary) / 0.25), 0 0 0 1px hsl(var(--gold) / 0.08)' }}
                >
                  <DropdownMenuLabel className="font-normal px-2 py-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none">{user?.full_name}</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer gap-2 rounded-md focus:bg-secondary/80">
                    <User className="w-4 h-4 text-primary" />
                    <span>Meu Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 rounded-md text-destructive focus:text-destructive focus:bg-destructive/10"
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
              <AppBreadcrumb />
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
