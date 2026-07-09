import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Crown, LayoutDashboard, Building2, Users, CreditCard, Server, Flag, UserCog, ScrollText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import FounderBadge from '@/components/founder/FounderBadge';

const navItems = [
  { to: '/app/founder', end: true, icon: LayoutDashboard, label: 'Dashboard Global' },
  { to: '/app/founder/empresas', icon: Building2, label: 'Empresas' },
  { to: '/app/founder/utilizadores', icon: Users, label: 'Utilizadores' },
  { to: '/app/founder/assinaturas', icon: CreditCard, label: 'Assinaturas' },
  { to: '/app/founder/infraestrutura', icon: Server, label: 'Infraestrutura' },
  { to: '/app/founder/feature-flags', icon: Flag, label: 'Feature Flags' },
  { to: '/app/founder/simulacao', icon: UserCog, label: 'Simulação' },
  { to: '/app/founder/auditoria', icon: ScrollText, label: 'Auditoria' },
  { to: '/app/founder/configuracoes', icon: Settings, label: 'Configurações' },
];

export const FounderLayout: React.FC = () => {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-accent text-accent-foreground shadow-lg">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Founder Control Center</h1>
            <p className="text-sm text-muted-foreground">
              Painel exclusivo do fundador da NAVANHULA CLOUD
            </p>
          </div>
        </div>
        <FounderBadge />
      </header>

      <nav className="flex flex-wrap gap-1.5 rounded-xl border border-border/60 bg-card/50 p-1.5 backdrop-blur">
        {navItems.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="min-h-[50vh]">
        <Outlet />
      </div>
    </div>
  );
};

export default FounderLayout;
