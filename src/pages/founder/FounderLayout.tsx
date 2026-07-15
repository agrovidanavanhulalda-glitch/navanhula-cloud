import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Crown, LayoutDashboard, Building2, Users, CreditCard, Flag, UserCog, ScrollText, Settings, DatabaseBackup, HeartPulse, FileText, Bell, TrendingUp, DollarSign, Receipt, AlertOctagon, BellRing, LifeBuoy, Gauge, ShieldCheck, Wrench, Activity, Brain, Bot, ClipboardList, Rocket, ClipboardCheck, Lightbulb, FlaskConical, Gavel, Compass, Landmark, Sparkles, Network, Zap, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import FounderBadge from '@/components/founder/FounderBadge';
import { installServerTelemetrySink } from '@/lib/telemetry/serverSink';

const navItems = [
  { to: '/app/founder', end: true, icon: LayoutDashboard, label: 'Dashboard Global' },
  { to: '/app/founder/dashboard-global', icon: TrendingUp, label: 'Analytics Global' },
  { to: '/app/founder/empresas', icon: Building2, label: 'Empresas' },
  { to: '/app/founder/utilizadores', icon: Users, label: 'Utilizadores' },
  { to: '/app/founder/assinaturas', icon: CreditCard, label: 'Assinaturas' },
  { to: '/app/founder/revenue', icon: DollarSign, label: 'Revenue' },
  { to: '/app/founder/faturas', icon: Receipt, label: 'Faturas' },
  { to: '/app/founder/fiscal-dashboard', icon: Receipt, label: 'Fiscal' },
  { to: '/app/founder/fiscal-dlq', icon: AlertOctagon, label: 'DLQ Fiscal' },
  { to: '/app/founder/fiscal-alertas', icon: BellRing, label: 'Alertas Fiscais' },
  { to: '/app/founder/backup', icon: DatabaseBackup, label: 'Backup' },
  { to: '/app/founder/health', icon: HeartPulse, label: 'System Health' },
  { to: '/app/founder/operations', icon: LifeBuoy, label: 'Operations Center' },
  { to: '/app/founder/capacity', icon: Gauge, label: 'Capacity' },
  { to: '/app/founder/finops', icon: DollarSign, label: 'FinOps' },
  { to: '/app/founder/predictive', icon: TrendingUp, label: 'Predictive' },
  { to: '/app/founder/sre', icon: ShieldCheck, label: 'SRE' },
  { to: '/app/founder/auto-healing', icon: Wrench, label: 'Auto-Healing' },
  { to: '/app/founder/executive-analytics', icon: Activity, label: 'Executive Analytics' },
  { to: '/app/founder/operations-intelligence', icon: Activity, label: 'Ops Intelligence' },
  { to: '/app/founder/executive-copilot', icon: Brain, label: 'Executive Copilot' },
  { to: '/app/founder/agent-center', icon: Bot, label: 'Agent Center' },
  { to: '/app/founder/agent-audit', icon: ClipboardList, label: 'Agent Audit' },
  { to: '/app/founder/execution-center', icon: Rocket, label: 'Execution Center' },
  { to: '/app/founder/approval-center', icon: ClipboardCheck, label: 'Approval Center' },
  { to: '/app/founder/knowledge-center', icon: Lightbulb, label: 'Knowledge Center' },
  { to: '/app/founder/simulation-lab', icon: FlaskConical, label: 'Simulation Lab' },
  { to: '/app/founder/policy-center', icon: Gavel, label: 'Policy Center' },
  { to: '/app/founder/strategy-center', icon: Compass, label: 'Strategy Center' },
  { to: '/app/founder/governance-center', icon: Landmark, label: 'Governance Center' },
  { to: '/app/founder/decision-center', icon: Sparkles, label: 'Decision Center' },
  { to: '/app/founder/architecture-center', icon: Network, label: 'Architecture Center' },
  { to: '/app/founder/transformation-center', icon: Zap, label: 'Transformation Center' },
  { to: '/app/founder/risk-center', icon: ShieldAlert, label: 'Risk Center' },
  { to: '/app/founder/metricas', icon: TrendingUp, label: 'Métricas' },
  { to: '/app/founder/logs', icon: FileText, label: 'Logs' },
  { to: '/app/founder/alertas', icon: Bell, label: 'Alertas' },
  { to: '/app/founder/feature-flags', icon: Flag, label: 'Feature Flags' },
  { to: '/app/founder/simulacao', icon: UserCog, label: 'Simulação' },
  { to: '/app/founder/auditoria', icon: ScrollText, label: 'Auditoria' },
  { to: '/app/founder/configuracoes', icon: Settings, label: 'Configurações' },
];

export const FounderLayout: React.FC = () => {
  React.useEffect(() => { installServerTelemetrySink(); }, []);
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
