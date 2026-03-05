import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Sobre', href: '/sobre' },
  { label: 'Preços', href: '/precos' },
  { label: 'Recursos', href: '/recursos' },
  { label: 'Contacto', href: '/contato' },
];

const PublicSiteLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="container flex flex-col gap-4 py-4 md:h-20 md:flex-row md:items-center md:justify-between md:py-0">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
                style={{ boxShadow: 'var(--shadow-glow)' }}
              >
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">NAVANHULA POS</p>
                <p className="text-xs text-muted-foreground">SaaS público + privado para retalho moderno</p>
              </div>
            </Link>

            <div className="flex items-center gap-2 md:hidden">
              <Button variant="ghost" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link to="/registrar">Criar conta</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <nav className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link to="/registrar">Começar agora</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-border bg-card/40">
        <div className="container flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-2">
            <p className="text-lg font-black tracking-tight">NAVANHULA POS</p>
            <p className="text-sm text-muted-foreground">Tecnologia para empresas que querem crescer.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link to="/sobre" className="transition-colors hover:text-foreground">
              Sobre
            </Link>
            <Link to="/precos" className="transition-colors hover:text-foreground">
              Preços
            </Link>
            <Link to="/recursos" className="transition-colors hover:text-foreground">
              Recursos
            </Link>
            <Link to="/contato" className="transition-colors hover:text-foreground">
              Contato
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicSiteLayout;
