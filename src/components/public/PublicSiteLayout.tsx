import React, { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import UrgencyBanner from '@/components/public/landing/UrgencyBanner';
import BrandLogo from '@/components/brand/BrandLogo';

import WhatsAppFloat from './landing/WhatsAppFloat';

const navItems = [
  { label: 'Início', hash: '#top' },
  { label: 'Funcionalidades', hash: '#recursos' },
  { label: 'Preços', hash: '#precos' },
  { label: 'Entrar', path: '/login' },
];

const PublicSiteLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname !== '/') {
      return;
    }

    if (!location.hash || location.hash === '#top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const scrollToSection = () => {
      const element = document.querySelector(location.hash);
      if (element instanceof HTMLElement) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    const frame = window.requestAnimationFrame(scrollToSection);
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.pathname]);

  const handleSectionNavigation = (hash?: string, path?: string) => {
    if (path) {
      navigate(path);
      return;
    }
    if (hash) {
      if (location.pathname !== '/') {
        navigate({ pathname: '/', hash });
      } else {
        const element = document.querySelector(hash);
        if (element instanceof HTMLElement) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-clip bg-background text-foreground">
      <UrgencyBanner />
      <header className="sticky top-0 z-50 border-b border-border/60 bg-white/90 backdrop-blur-md">
        <div className="container flex h-20 items-center justify-between">
          <button type="button" onClick={() => handleSectionNavigation('#top')} className="flex items-center gap-3 group">
            <BrandLogo width={160} priority className="transition-transform group-hover:scale-105" />
          </button>

          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleSectionNavigation(item.hash, item.path)}
                className="text-sm font-semibold text-[#0B3C5D]/70 transition-colors hover:text-[#0B3C5D]"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button 
              asChild 
              className="hidden sm:flex bg-[#F4B400] hover:bg-[#F4B400]/90 text-[#0B3C5D] font-bold rounded-full px-6"
            >
              <Link to="/registrar">Começar Agora</Link>
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden">
              <span className="sr-only">Menu</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-0 flex-1">
        <Outlet />
      </main>

      <footer className="relative z-0 border-t border-white/10 bg-[#0B3C5D] text-white">
        <div className="container flex flex-col gap-6 py-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl space-y-4">
            <div className="flex items-center gap-2">
              <BrandLogo width={140} />
            </div>
            <p className="text-sm leading-7 text-blue-100/70">
              O sistema de gestão empresarial líder para negócios que buscam crescimento e controle total.
            </p>
            <p className="text-xs text-blue-100/50">© {new Date().getFullYear()} NAVANHULA GROUP LDA · Todos os direitos reservados.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {navItems.slice(1).map((item) => (
              <button
                key={item.hash}
                type="button"
                onClick={() => handleSectionNavigation(item.hash)}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </footer>
      <WhatsAppFloat />
    </div>
  );
};

export default PublicSiteLayout;
