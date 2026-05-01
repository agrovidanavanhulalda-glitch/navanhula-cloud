import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalPOS } from '@/contexts/LocalPOSContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ShoppingCart, Package, Settings, LogOut,
  WalletCards, History, BarChart3, TrendingUp, Boxes, Shield, User,
  MessageSquare, Users, UserPlus, Link2, Wallet, FileText, BookOpen,
  UserCheck, Truck, PieChart, Sprout, Egg, Brain, ShoppingBag, Smartphone,
  Cloud, Store, ChevronDown, Calculator, CreditCard, Banknote,
  Building2, MapPin, Bird, MessageCircle, ArrowRightLeft, Landmark, Key,
  Target, Gift, Rocket,
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
}

interface NavGroup {
  title: string;
  icon: React.ElementType;
  roles?: string[];
  items: SubItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Painel',
    icon: LayoutDashboard,
    items: [
      { label: 'Visão Geral', href: '/app/dashboard', icon: LayoutDashboard },
      { label: 'Painel CEO', href: '/app/ceo', icon: TrendingUp },
      { label: 'Painel Diretor', href: '/app/dashboard/diretor', icon: Building2 },
      { label: 'Painel Gestor', href: '/app/dashboard/gestor', icon: Users },
      { label: 'Painel RH', href: '/app/dashboard/rh', icon: User },
      { label: 'BI Analytics', href: '/app/bi', icon: PieChart },
    ],
  },
  {
    title: 'Vendas (PDV)',
    icon: ShoppingCart,
    roles: ['admin', 'ceo', 'director', 'manager', 'seller', 'cashier'],
    items: [
      { label: 'PDV', href: '/app/pdv', icon: ShoppingCart },
      { label: 'Caixa', href: '/app/caixa', icon: WalletCards },
      { label: 'Histórico', href: '/app/vendas', icon: History },
      { label: 'Loja Online', href: '/app/ecommerce', icon: ShoppingBag },
    ],
  },
  {
    title: 'Produtos',
    icon: Package,
    roles: ['admin', 'ceo', 'director', 'manager', 'seller'],
    items: [
      { label: 'Meus Produtos', href: '/app/produtos', icon: Package },
    ],
  },
  {
    title: 'Estoque',
    icon: Boxes,
    roles: ['admin', 'ceo', 'director', 'manager', 'seller'],
    items: [
      { label: 'Inventário', href: '/app/estoque', icon: Boxes },
      { label: 'Transferências', href: '/app/transferencias-stock', icon: ArrowRightLeft },
      { label: 'Estoque Filiais', href: '/app/estoque-filiais', icon: Building2 },
    ],
  },
  {
    title: 'Clientes',
    icon: UserCheck,
    roles: ['admin', 'manager', 'ceo', 'director'],
    items: [
      { label: 'Gestão CRM', href: '/app/crm', icon: UserCheck },
      { label: 'Fornecedores', href: '/app/fornecedores', icon: Truck },
    ],
  },
  {
    title: 'Relatórios',
    icon: BarChart3,
    roles: ['admin', 'manager', 'ceo', 'director'],
    items: [
      { label: 'Vendas & Lucro', href: '/app/relatorios', icon: BarChart3 },
      { label: 'Relatórios Fiscais', href: '/app/relatorios-fiscais', icon: FileText },
      { label: 'Financeiro', href: '/app/financeiro-rh', icon: TrendingUp },
    ],
  },
  {
    title: 'Configurações',
    icon: Settings,
    roles: ['admin', 'ceo', 'manager'],
    items: [
      { label: 'Sistema', href: '/app/configuracoes', icon: Settings },
      { label: 'Gestão Fiscal', href: '/app/fiscal', icon: FileText },
      { label: 'Contas Bancárias', href: '/app/banco', icon: Landmark },
      { label: 'Equipa', href: '/app/equipa', icon: Users },
      { label: 'Lojas', href: '/app/lojas', icon: Store },
      { label: 'AI Engine', href: '/app/ai', icon: Brain },
      { label: 'WhatsApp', href: '/app/whatsapp', icon: MessageCircle },
      { label: 'Compliance Hub', href: '/app/compliance', icon: Shield },
      { label: 'IAM (Acessos)', href: '/app/iam', icon: Shield },
      { label: 'Automação', href: '/app/automacao', icon: Settings },
      { label: 'API Keys', href: '/app/api-keys', icon: Key },
      { label: 'Documentos', href: '/app/documentos', icon: FileText },
      { label: 'Marketplace', href: '/app/marketplace', icon: ShoppingBag },
      { label: 'Agricultura', href: '/app/agricultura', icon: Sprout },
      { label: 'Avicultura', href: '/app/avicultura', icon: Egg },
      { label: 'Ambiente & Clima', href: '/app/ambiente', icon: Cloud },
      { label: 'Auditoria', href: '/app/auditoria', icon: Shield },
    ],
  },
];

const adminResellerItems: SubItem[] = [
  { label: 'Dashboard', href: '/app/revendedores/dashboard', icon: Users },
  { label: 'Cadastrar', href: '/app/revendedores/cadastrar', icon: UserPlus },
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

const Sidebar: React.FC<{ forceExpanded?: boolean }> = ({ forceExpanded }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, company, store, signOut, role } = useAuth();
  const { currentCashRegister } = useLocalPOS();
  const { state } = useSidebar();
  const collapsed = forceExpanded ? false : state === 'collapsed';

  const isBackofficeAdmin = role === 'admin' || role === 'manager' || role === 'ceo' || role === 'director';
  const isReseller = role === 'reseller';
  const rawName = currentCashRegister?.sellerName || user?.full_name || '';
  const currentOperator = rawName && !/^[0-9a-f-]{36}$/i.test(rawName) ? rawName : 'Operador';
  const currentOperatorRole =
    role === 'reseller' ? 'Revendedor' :
    role === 'ceo' ? 'CEO' :
    role === 'director' ? 'Diretor' :
    role === 'manager' ? 'Gestor' :
    role === 'hr' ? 'RH' :
    role === 'cashier' ? 'Caixa' :
    isBackofficeAdmin ? 'Administrador' : 'Vendedor';

  // Filter Dashboard sub-items by role
  const filterDashboardItems = (items: SubItem[]): SubItem[] => {
    const dashboardVisibility: Record<string, string[]> = {
      '/app/ceo': ['ceo', 'admin'],
      '/app/dashboard/diretor': ['director', 'ceo', 'admin'],
      '/app/dashboard/gestor': ['manager', 'director', 'ceo', 'admin'],
      '/app/dashboard/rh': ['hr', 'director', 'ceo', 'admin'],
      '/app/bi': ['ceo', 'admin', 'director'],
    };
    return items.filter(item => {
      const allowed = dashboardVisibility[item.href];
      if (!allowed) return true;
      return allowed.includes(role || '');
    });
  };

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
        <SidebarMenuSubButton asChild isActive={active}>
          <Link to={item.href} className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  };

  const renderCollapsibleGroup = (group: NavGroup) => {
    if (group.roles && !group.roles.includes(role || 'seller')) return null;
    const Icon = group.icon;
    // Filter items for Dashboard group based on role
    const visibleItems = group.title === 'Painel' ? filterDashboardItems(group.items) : group.items;
    if (visibleItems.length === 0) return null;
    const hasActive = groupHasActive(visibleItems);

    return (
      <Collapsible key={group.title} defaultOpen={hasActive} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={group.title}
              className={cn(
                'font-semibold text-sidebar-foreground/80',
                hasActive && 'text-sidebar-primary-foreground bg-sidebar-accent'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{group.title}</span>
              <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
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
          <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
            <Link to={item.href} className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <ShadcnSidebar collapsible={forceExpanded ? "none" : "icon"} className="border-r border-sidebar-border">
      {/* Brand Header */}
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Cloud className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-sm text-sidebar-primary-foreground tracking-tight leading-none uppercase">Menu Principal</h1>
              <p className="text-[10px] font-medium tracking-widest text-sidebar-foreground/50 uppercase">Navanhula Cloud</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
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

        {/* Reseller Admin */}
        {!isReseller && isBackofficeAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Revendedores</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <Collapsible defaultOpen={groupHasActive(adminResellerItems)} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Rede Comercial" className="font-semibold text-sidebar-foreground/80">
                        <Users className="h-4 w-4" />
                        <span>Rede Comercial</span>
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

      {/* Footer — User & Logout */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <div className="mb-2 p-2.5 rounded-lg bg-sidebar-accent/10 border border-sidebar-border/50">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-sidebar-foreground/50 uppercase font-bold tracking-wider">Estado da Rede</p>
                <div className="flex items-center gap-2 mt-1">
                  <NetworkIndicator />
                  <span className="text-[10px] text-sidebar-foreground/70">Sistema Online</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </SidebarFooter>
    </ShadcnSidebar>
  );
};

export default Sidebar;
