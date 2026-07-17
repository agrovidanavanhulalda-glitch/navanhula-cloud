import React, { useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalPOS } from '@/contexts/LocalPOSContext';
import { useI18n } from '@/contexts/i18n';
import { usePermissions } from '@/hooks/usePermissions';

import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ShoppingCart, Package, Settings, LogOut,
  WalletCards, History, BarChart3, TrendingUp, Boxes, Shield, User,
  Users, UserPlus, Link2, Wallet, FileText,
  UserCheck, Truck, PieChart, Sprout, Egg, Brain, ShoppingBag,
  Cloud, Store, ChevronDown, 
  Building2, MessageCircle, ArrowRightLeft, Landmark, Key,
  ShieldCheck, Database, Warehouse, Crown
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import NetworkIndicator from './NetworkIndicator';
import BrandLogo from '@/components/brand/BrandLogo';

interface SubItem {
  label: string;
  href: string;
  icon: React.ElementType;
  module?: string;
  minRole?: string;
  permission?: string; // RBAC Phase 2 — granular `modulo.acao`
}

interface NavGroup {
  title: string;
  icon: React.ElementType;
  module?: string;
  minRole?: string;
  permission?: string;
  items: SubItem[];
}

const Sidebar: React.FC<{ forceExpanded?: boolean }> = ({ forceExpanded }) => {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, role, hasPerm, isFounder } = useAuth();
  const { hasMinimumRole, canViewModule, isMaster } = usePermissions();
  const { currentCashRegister } = useLocalPOS();
  const { state } = useSidebar();
  const collapsed = forceExpanded ? false : state === 'collapsed';

  const navGroups: NavGroup[] = [
    {
      title: t('common.open'),
      icon: LayoutDashboard,
      items: [
        ...(isFounder ? [{ label: '👑 Founder', href: '/app/founder', icon: Crown }] : []),
        { label: t('nav.dashboard'), href: '/app/dashboard', icon: LayoutDashboard },
        { label: t('nav.ceoDashboard'), href: '/app/ceo', icon: TrendingUp, minRole: 'ceo' },
        { label: 'Visão Direção', href: '/app/dashboard/diretor', icon: Building2, minRole: 'ceo' },
        { label: 'Visão Gestão', href: '/app/dashboard/gestor', icon: Users, minRole: 'manager' },
        { label: 'Recursos Humanos', href: '/app/dashboard/rh', icon: User, minRole: 'manager' },
        { label: t('nav.bi'), href: '/app/bi', icon: PieChart, minRole: 'manager' },
      ],
    },
    {
      title: t('nav.sales'),
      icon: ShoppingCart,
      module: 'sales',
      permission: 'sales.view',
      items: [
        { label: t('pos.title'), href: '/app/pdv', icon: ShoppingCart, permission: 'sales.view' },
        { label: t('nav.cashRegister'), href: '/app/caixa', icon: WalletCards, permission: 'cash.view' },
        { label: t('nav.sales'), href: '/app/vendas', icon: History, permission: 'sales.view' },
        { label: 'Loja Online', href: '/app/ecommerce', icon: ShoppingBag, minRole: 'admin' },
      ],
    },
    {
      title: t('nav.products'),
      icon: Package,
      module: 'products',
      permission: 'inventory.view',
      items: [
        { label: t('nav.products'), href: '/app/produtos', icon: Package, permission: 'inventory.view' },
      ],
    },
    {
      title: t('nav.inventory'),
      icon: Boxes,
      module: 'stock',
      permission: 'inventory.view',
      items: [
        { label: t('nav.inventory'), href: '/app/estoque', icon: Boxes, permission: 'inventory.view' },
        { label: 'Gestão WMS', href: '/app/wms', icon: Warehouse, minRole: 'manager' },
        { label: 'Mover Stock', href: '/app/transferencias-stock', icon: ArrowRightLeft, minRole: 'manager' },
        { label: 'Stock das Filiais', href: '/app/estoque-filiais', icon: Building2, minRole: 'manager' },
      ],
    },
    {
      title: t('dashboard.customers'),
      icon: UserCheck,
      module: 'crm',
      minRole: 'seller',
      items: [
        { label: t('dashboard.customers'), href: '/app/crm', icon: UserCheck },
        { label: t('nav.suppliers'), href: '/app/fornecedores', icon: Truck, minRole: 'manager' },
      ],
    },
    {
      title: t('nav.reports'),
      icon: BarChart3,
      module: 'reports',
      permission: 'reports.view',
      items: [
        { label: 'Vendas e Lucros', href: '/app/relatorios', icon: BarChart3, permission: 'reports.view' },
        { label: 'Documentos Fiscais', href: '/app/relatorios-fiscais', icon: FileText, permission: 'finance.view' },
        { label: t('nav.financial'), href: '/app/financeiro-rh', icon: TrendingUp, permission: 'finance.view' },
      ],
    },
    {
      title: t('nav.settings'),
      icon: Settings,
      module: 'settings',
      permission: 'settings.manage',
      items: [
        { label: t('nav.settings'), href: '/app/configuracoes', icon: Settings, permission: 'settings.manage' },
        { label: 'Regras de Impostos', href: '/app/fiscal', icon: FileText, minRole: 'admin' },
        { label: 'Contas Bancárias', href: '/app/banco', icon: Landmark, minRole: 'admin' },
        { label: 'Minha Equipa', href: '/app/equipa', icon: Users, permission: 'users.view' },
        { label: t('nav.stores'), href: '/app/lojas', icon: Store, permission: 'branches.manage' },
        { label: 'Assistente com IA', href: '/app/ai', icon: Brain, minRole: 'manager' },
        { label: 'Mensagens WhatsApp', href: '/app/whatsapp', icon: MessageCircle, minRole: 'manager' },
        { label: 'Segurança e Regras', href: '/app/compliance', icon: Shield, minRole: 'admin' },
        { label: 'Níveis de Acesso', href: '/app/iam', icon: Shield, permission: 'roles.manage' },
        { label: 'Tarefas Automáticas', href: '/app/automacao', icon: Settings, minRole: 'admin' },
        { label: 'Chaves de Integração', href: '/app/api-keys', icon: Key, minRole: 'admin' },
        { label: 'Pasta de Arquivos', href: '/app/documentos', icon: FileText, minRole: 'manager' },
        { label: 'Mercado Aberto', href: '/app/marketplace', icon: ShoppingBag, minRole: 'manager' },
        { label: t('nav.agriculture'), href: '/app/agricultura', icon: Sprout, minRole: 'manager' },
        { label: t('nav.poultry'), href: '/app/avicultura', icon: Egg, minRole: 'manager' },
        { label: 'Clima e Ambiente', href: '/app/ambiente', icon: Cloud, minRole: 'manager' },
        { label: 'Verificação de Dados', href: '/app/auditoria', icon: Shield, minRole: 'admin' },
      ],
    },
  ];

  const adminResellerItems: SubItem[] = [
    { label: t('nav.dashboard'), href: '/app/revendedores/dashboard', icon: Users },
    { label: t('common.add'), href: '/app/revendedores/cadastrar', icon: UserPlus },
    { label: 'Lista', href: '/app/revendedores/lista', icon: Users },
    { label: 'Comissões', href: '/app/revendedores/comissoes', icon: TrendingUp },
    { label: 'Pagamentos', href: '/app/revendedores/pagamentos', icon: Wallet },
    { label: 'Links', href: '/app/revendedores/links', icon: Link2 },
    { label: 'Performance', href: '/app/revendedores/performance', icon: BarChart3 },
    { label: 'Materiais', href: '/app/revendedores/materiais', icon: FileText },
  ];

  const resellerPortalItems: SubItem[] = [
    { label: 'Meu Painel', href: '/app/revendedores/dashboard', icon: LayoutDashboard },
    { label: 'Clientes Indicados', href: '/app/revendedores/lista', icon: Users },
    { label: 'Comissões', href: '/app/revendedores/comissoes', icon: TrendingUp },
    { label: 'Pagamentos', href: '/app/revendedores/pagamentos', icon: Wallet },
    { label: 'Links', href: '/app/revendedores/links', icon: Link2 },
    { label: 'Materiais', href: '/app/revendedores/materiais', icon: FileText },
    { label: 'Performance', href: '/app/revendedores/performance', icon: BarChart3 },
  ];

  const isBackofficeAdmin = hasMinimumRole('manager');
  const isReseller = role === 'reseller';
  const rawName = currentCashRegister?.sellerName || user?.full_name || '';
  const currentOperator = rawName && !/^[0-9a-f-]{36}$/i.test(rawName) ? rawName : t('cash.operator');
  
  // Filter sub-items by granular permission, role and module (in that priority).
  const filterSubItems = useCallback((items: SubItem[]): SubItem[] => {
    return items.filter(item => {
      try {
        if (item.permission && !hasPerm(item.permission)) return false;
        if (item.minRole && !hasMinimumRole(item.minRole)) return false;
        if (item.module && !canViewModule(item.module)) return false;
        return true;
      } catch (e) {
        console.warn('[Sidebar] Permission check failed for item:', item.label, e);
        return false;
      }
    });
  }, [hasPerm, hasMinimumRole, canViewModule]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  const groupHasActive = (items: SubItem[]) =>
    items.some(item => isActive(item.href));

  const renderSubItem = (item: SubItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <SidebarMenuSubItem key={item.href + item.label}>
        <SidebarMenuSubButton
          asChild
          isActive={active}
          className={cn(
            'group/sub relative rounded-md transition-all duration-200 min-h-9',
            'hover:bg-sidebar-accent/40 hover:translate-x-0.5',
            active && 'bg-sidebar-accent/60 text-sidebar-primary-foreground font-semibold shadow-sm'
          )}
        >
          <Link to={item.href} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className={cn(
                'absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full transition-all duration-200',
                active
                  ? 'bg-[hsl(var(--gold))] opacity-100'
                  : 'bg-[hsl(var(--gold))] opacity-0 group-hover/sub:opacity-40'
              )}
            />
            <Icon className={cn('h-4 w-4 transition-colors', active && 'text-[hsl(var(--gold))]')} />
            <span className="truncate">{item.label}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  };

  const renderCollapsibleGroup = (group: NavGroup) => {
    if (group.permission && !hasPerm(group.permission)) return null;
    if (group.minRole && !hasMinimumRole(group.minRole)) return null;
    if (group.module && !canViewModule(group.module)) return null;
    const Icon = group.icon;
    const visibleItems = filterSubItems(group.items);
    if (visibleItems.length === 0) return null;
    const hasActive = groupHasActive(visibleItems);

    return (
      <Collapsible key={group.title} defaultOpen={hasActive} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={group.title}
              className={cn(
                'group/trigger relative font-semibold text-sidebar-foreground/80 rounded-lg transition-all duration-200 min-h-10',
                'hover:bg-sidebar-accent/40 hover:text-sidebar-primary-foreground',
                hasActive &&
                  'text-sidebar-primary-foreground bg-gradient-to-r from-sidebar-accent/70 via-sidebar-accent/40 to-transparent shadow-sm'
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full transition-all duration-200',
                  hasActive ? 'bg-[hsl(var(--gold))] opacity-100' : 'opacity-0'
                )}
              />
              <Icon
                className={cn(
                  'h-4 w-4 transition-colors',
                  hasActive && 'text-[hsl(var(--gold))]'
                )}
              />
              <span className="tracking-tight">{group.title}</span>
              <ChevronDown className="ml-auto h-3.5 w-3.5 text-sidebar-foreground/50 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-180" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
            <SidebarMenuSub className="border-l border-sidebar-border/60 ml-3.5 pl-2 mt-1">
              {visibleItems.map(renderSubItem)}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  };

  const renderFlatItems = (items: SubItem[]) =>
    items.map(item => {
      const Icon = item.icon;
      const active = isActive(item.href);
      return (
        <SidebarMenuItem key={item.href + item.label}>
          <SidebarMenuButton
            asChild
            isActive={active}
            tooltip={item.label}
            className={cn(
              'group/flat relative rounded-lg transition-all duration-200 min-h-10',
              'hover:bg-sidebar-accent/40',
              active && 'bg-gradient-to-r from-sidebar-accent/70 via-sidebar-accent/40 to-transparent text-sidebar-primary-foreground font-semibold'
            )}
          >
            <Link to={item.href} className="flex items-center gap-2.5">
              <span
                aria-hidden
                className={cn(
                  'absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full transition-all duration-200',
                  active ? 'bg-[hsl(var(--gold))] opacity-100' : 'opacity-0 group-hover/flat:opacity-40 bg-[hsl(var(--gold))]'
                )}
              />
              <Icon className={cn('h-4 w-4 transition-colors', active && 'text-[hsl(var(--gold))]')} />
              <span className="truncate">{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <ShadcnSidebar
      collapsible={forceExpanded ? "none" : "icon"}
      className="border-r border-sidebar-border/60 bg-sidebar/95 backdrop-blur-xl supports-[backdrop-filter]:bg-sidebar/80"
    >
      <SidebarHeader className="relative border-b border-sidebar-border/60 p-4">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/60 to-transparent"
        />
        <div className={cn('flex items-center gap-3', collapsed ? 'justify-center px-0' : 'px-1')}>
          <BrandLogo
            width={collapsed ? 36 : 140}
            height={collapsed ? 36 : undefined}
            className="transition-all duration-300"
          />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-[11px] text-sidebar-primary-foreground tracking-tight leading-none uppercase">Menu Principal</h1>
              <p className="text-[9px] font-medium tracking-[0.14em] text-sidebar-foreground/50 uppercase mt-0.5">Navanhula Cloud</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {isReseller ? (
          <SidebarGroup>
            <SidebarGroupLabel>Portal Revendedor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderFlatItems(resellerPortalItems)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navGroups.map(renderCollapsibleGroup)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!isReseller && isBackofficeAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('nav.resellers')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <Collapsible defaultOpen={groupHasActive(adminResellerItems)} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Rede Comercial" className="font-semibold text-sidebar-foreground/80">
                        <Users className="h-4 w-4" />
                        <span>{t('nav.community')}</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {adminResellerItems.map(renderSubItem)}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 gap-2">
        {!collapsed && (
          <div className="flex flex-col gap-2">
            <div className="p-2.5 rounded-lg bg-sidebar-accent/10 border border-sidebar-border/50">
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] text-sidebar-foreground/50 uppercase font-bold tracking-wider">Segurança & Estado</p>
                <NetworkIndicator />
                <div className="flex items-center gap-2 px-1 text-[10px] text-sidebar-foreground/70">
                  <Database className="w-3 h-3 text-success" />
                  <span className="font-medium">Backup em tempo real</span>
                </div>
                <div className="flex items-center gap-2 px-1 text-[10px] text-sidebar-foreground/70">
                  <ShieldCheck className="w-3 h-3 text-primary" />
                  <span className="font-medium">Proteção SSL Ativa</span>
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="text-xs font-semibold">{t('auth.logout')}</span>
            </Button>
          </div>
        )}
        {collapsed && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <ShieldCheck className="w-4 h-4 text-primary/50" />
          </div>
        )}
      </SidebarFooter>
    </ShadcnSidebar>
  );
};

export default Sidebar;