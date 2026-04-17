import React, { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import UrgencyBanner from '@/components/public/landing/UrgencyBanner';
import BrandLogo from '@/components/brand/BrandLogo';

const navItems = [
  { label: 'Home', hash: '#top' },
  { label: 'Sobre', hash: '#beneficios' },
  { label: 'Teste Grátis', hash: '#teste-gratis' },
  { label: 'Preços', hash: '#precos' },
  { label: 'Contacto', hash: '#contacto' },
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

  const handleSectionNavigation = (hash: string) => {
    navigate({ pathname: '/', hash });
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-clip bg-background text-foreground">
      <UrgencyBanner />
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="container flex flex-col gap-4 py-4 md:h-20 md:flex-row md:items-center md:justify-between md:py-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <button type="button" onClick={() => handleSectionNavigation('#top')} className="flex items-center gap-3 text-left min-w-0 shrink group">
              <BrandLogo size={56} glow priority className="md:!w-[64px] md:!h-[64px]" />

              <div className="min-w-0 hidden sm:block">
                <p className="text-sm font-black tracking-tight truncate md:text-lg">NAVANHULA CLOUD</p>
                <p className="text-[10px] text-muted-foreground truncate md:text-xs">Enterprise SaaS Platform</p>
              </div>
            </button>

            <div className="flex items-center gap-1 shrink-0 md:hidden">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/registrar" className="text-xs">CRIAR CONTA</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <nav className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              {navItems.map((item) => {
                const isActive =
                  location.pathname === '/' &&
                  ((item.hash === '#top' && (!location.hash || location.hash === '#top')) || location.hash === item.hash);

                return (
                  <button
                    key={item.hash}
                    type="button"
                    onClick={() => handleSectionNavigation(item.hash)}
                    className={cn(
                      'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link to="/registrar">CRIAR CONTA</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-0 flex-1">
        <Outlet />
      </main>

      <footer className="relative z-0 border-t border-border bg-card/40">
        <div className="container flex flex-col gap-6 py-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl space-y-3">
            <div className="flex items-center gap-3">
              <BrandLogo size={48} />
              <p className="text-lg font-black tracking-tight">NAVANHULA CLOUD</p>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              Plataforma profissional para gestão empresarial completa.
            </p>
            <p className="text-xs text-muted-foreground">© NAVANHULA GROUP LDA · Todos os direitos reservados.</p>
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
    </div>
  );
};

export default PublicSiteLayout;
