import React, { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Home', hash: '#top' },
  { label: 'Sobre', hash: '#sobre' },
  { label: 'Preços', hash: '#precos' },
  { label: 'Recursos', hash: '#recursos' },
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="container flex flex-col gap-4 py-4 md:h-20 md:flex-row md:items-center md:justify-between md:py-0">
          <div className="flex items-center justify-between gap-4">
            <button type="button" onClick={() => handleSectionNavigation('#top')} className="flex items-center gap-3 text-left">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
                style={{ boxShadow: 'var(--shadow-glow)' }}
              >
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">NAVANHULA ERP</p>
                <p className="text-xs text-muted-foreground">Controle total do seu negócio em tempo real.</p>
              </div>
            </button>

            <div className="flex items-center gap-2 md:hidden">
              <Button variant="ghost" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link to="/registrar">CRIAR CONTA</Link>
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

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-border bg-card/40">
        <div className="container flex flex-col gap-6 py-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl space-y-3">
            <p className="text-lg font-black tracking-tight">NAVANHULA ERP</p>
            <p className="text-sm leading-7 text-muted-foreground">
              Sistema ERP profissional para gestão empresarial completa.
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
