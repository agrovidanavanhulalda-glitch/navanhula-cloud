import React, { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LocalPOSProvider } from "@/contexts/LocalPOSContext";
import { SimulationProvider } from "@/contexts/SimulationContext";
import { Loader2 } from "lucide-react";
import EnterpriseDebugMonitor from "./components/debug/EnterpriseDebugMonitor";
import { Button } from "@/components/ui/button";
import { isValidId } from "@/lib/uuid";
import SubscriptionGate from "@/components/layout/SubscriptionGate";
import { getDefaultRouteForRole, canAccessRoute } from "@/lib/roleRoutes";

import { I18nProvider } from "@/contexts/i18n";
import { AnimatePresence } from "framer-motion";
import PageTransition from "./components/layout/PageTransition";
import { ErrorBoundary } from "./components/error/ErrorBoundary";
import { GlobalFallback } from "./components/error/GlobalFallback";
import { supabase } from "@/integrations/supabase/client";

// Public site — eagerly loaded (landing page)
import MainLayout from "./components/layout/MainLayout";
import Index from "./pages/Index";

// Lazy-loaded pages for performance
const AuthLoginPage = React.lazy(() => import("./pages/AuthLoginPage"));
const AuthSignupPage = React.lazy(() => import("./pages/AuthSignupPage"));
const LocalDashboardPage = React.lazy(() => import("./pages/LocalDashboardPage"));
const LocalPOSPage = React.lazy(() => import("./pages/LocalPOSPage"));
const LocalProductsPage = React.lazy(() => import("./pages/LocalProductsPage"));
const LocalSettingsPage = React.lazy(() => import("./pages/LocalSettingsPage"));
const LocalStoresPage = React.lazy(() => import("./pages/LocalStoresPage"));
const LocalSellersPage = React.lazy(() => import("./pages/LocalSellersPage"));
const LocalCashRegisterPage = React.lazy(() => import("./pages/LocalCashRegisterPage"));
const LocalInventoryPage = React.lazy(() => import("./pages/LocalInventoryPage"));
const LocalReportsPage = React.lazy(() => import("./pages/LocalReportsPage"));
const LocalSalesHistoryPage = React.lazy(() => import("./pages/LocalSalesHistoryPage"));
const SubscriptionPage = React.lazy(() => import("./pages/SubscriptionPage"));
const CEODashboardPage = React.lazy(() => import("./pages/CEODashboardPage"));
const FounderLayout = React.lazy(() => import("./pages/founder/FounderLayout"));
const FounderDashboardPage = React.lazy(() => import("./pages/founder/FounderDashboardPage"));
const FounderFeatureFlagsPage = React.lazy(() => import("./pages/founder/FounderFeatureFlagsPage"));
const FounderComingSoonPage = React.lazy(() => import("./pages/founder/FounderComingSoonPage"));
const FounderCompaniesPage = React.lazy(() => import("./pages/founder/FounderCompaniesPage"));
const FounderUsersPage = React.lazy(() => import("./pages/founder/FounderUsersPage"));
const FounderSubscriptionsPage = React.lazy(() => import("./pages/founder/FounderSubscriptionsPage"));
const FounderAuditPage = React.lazy(() => import("./pages/founder/FounderAuditPage"));
const FounderSettingsPage = React.lazy(() => import("./pages/founder/FounderSettingsPage"));
const FounderBackupPage = React.lazy(() => import("./pages/founder/FounderBackupPage"));
const FounderSimulationPage = React.lazy(() => import("./pages/founder/FounderSimulationPage"));
const FounderHealthPage = React.lazy(() => import("./pages/founder/FounderHealthPage"));
const FounderLogsPage = React.lazy(() => import("./pages/founder/FounderLogsPage"));
const FounderAlertsPage = React.lazy(() => import("./pages/founder/FounderAlertsPage"));
const FounderMetricsPage = React.lazy(() => import("./pages/founder/FounderMetricsPage"));
const FounderRevenuePage = React.lazy(() => import("./pages/founder/FounderRevenuePage"));
const FounderInvoicesPage = React.lazy(() => import("./pages/founder/FounderInvoicesPage"));
const FounderGate = React.lazy(() => import("./components/auth/FounderGate"));
const FiscalPage = React.lazy(() => import("./pages/FiscalPage"));
const WalletPage = React.lazy(() => import("./pages/WalletPage"));
const ManualPaymentsPage = React.lazy(() => import("./pages/ManualPaymentsPage"));
const CommunityPage = React.lazy(() => import("./pages/CommunityPage"));
const FinancialReportsPage = React.lazy(() => import("./pages/FinancialReportsPage"));
const CRMPage = React.lazy(() => import("./pages/CRMPage"));
const AccountingPage = React.lazy(() => import("./pages/AccountingPage"));
const SuppliersPage = React.lazy(() => import("./pages/SuppliersPage"));
const BIDashboardPage = React.lazy(() => import("./pages/BIDashboardPage"));
const AIBusinessEnginePage = React.lazy(() => import("./pages/AIBusinessEnginePage"));
const DocumentsCenterPage = React.lazy(() => import("./pages/DocumentsCenterPage"));
const AgriculturePage = React.lazy(() => import("./pages/AgriculturePage"));
const ECommercePage = React.lazy(() => import("./pages/ECommercePage"));
const PoultryPage = React.lazy(() => import("./pages/PoultryPage"));
const PoultryIntelligencePage = React.lazy(() => import("./pages/PoultryIntelligencePage"));
const EnvironmentalDashboardPage = React.lazy(() => import("./pages/EnvironmentalDashboardPage"));
const AgroMapPage = React.lazy(() => import("./pages/AgroMapPage"));
const AgroOrdersPage = React.lazy(() => import("./pages/AgroOrdersPage"));
const ProducerDashboardPage = React.lazy(() => import("./pages/ProducerDashboardPage"));
const DriversPage = React.lazy(() => import("./pages/DriversPage"));
const HRDashboardPage = React.lazy(() => import("./pages/HRDashboardPage"));
const CriadoresPage = React.lazy(() => import("./pages/CriadoresPage"));
const MarketplacePage = React.lazy(() => import("./pages/MarketplacePage"));
const CompliancePage = React.lazy(() => import("./pages/CompliancePage"));
const FinanceTaxEnginePage = React.lazy(() => import("./pages/FinanceTaxEnginePage"));
const SystemAuditPage = React.lazy(() => import("./pages/SystemAuditPage"));
const WhatsAppAutomationPage = React.lazy(() => import("./pages/WhatsAppAutomationPage"));
const FinanceHRUnifiedPage = React.lazy(() => import("./pages/FinanceHRUnifiedPage"));
const DirectorDashboardPage = React.lazy(() => import("./pages/DirectorDashboardPage"));
const ManagerDashboardPage = React.lazy(() => import("./pages/ManagerDashboardPage"));
const HRDashboardPage2 = React.lazy(() => import("./pages/HRDashboardPage2"));
const AboutPage = React.lazy(() => import("./pages/AboutPage"));
const PricingPage = React.lazy(() => import("./pages/PricingPage"));
const FeaturesPage = React.lazy(() => import("./pages/FeaturesPage"));
const ContactPage = React.lazy(() => import("./pages/ContactPage"));
const ResellersNetworkPage = React.lazy(() => import("./pages/ResellersNetworkPage"));
const StockTransferPage = React.lazy(() => import("./pages/StockTransferPage"));
const BranchInventoryPage = React.lazy(() => import("./pages/BranchInventoryPage"));
const SalesMaterialsPage = React.lazy(() => import("./pages/SalesMaterialsPage"));
const BankAccountsPage = React.lazy(() => import("./pages/BankAccountsPage"));
const TaxReportsPage = React.lazy(() => import("./pages/TaxReportsPage"));
const CompanyUsersPage = React.lazy(() => import("./pages/CompanyUsersPage"));
const ApiKeysPage = React.lazy(() => import("./pages/ApiKeysPage"));
const IAMPage = React.lazy(() => import("./pages/IAMPage"));
const GovernancePage = React.lazy(() => import("./pages/GovernancePage"));
const AutomationRulesPage = React.lazy(() => import("./pages/AutomationRulesPage"));
const InviteAcceptPage = React.lazy(() => import("./pages/InviteAcceptPage"));
const LeadsPipelinePage = React.lazy(() => import("./pages/LeadsPipelinePage"));
const CrmTasksPage = React.lazy(() => import("./pages/CrmTasksPage"));
const CommercialDashboardPage = React.lazy(() => import("./pages/CommercialDashboardPage"));
const FounderGlobalDashboardPage = React.lazy(() => import("./pages/founder/FounderGlobalDashboardPage"));
const GrowthDashboardPage = React.lazy(() => import("./pages/GrowthDashboardPage"));
const ReferralPage = React.lazy(() => import("./pages/ReferralPage"));
const WMSDashboard = React.lazy(() => import("./pages/WMSDashboard"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const VersionUpdateAlert = React.lazy(() => import("@/components/common/VersionUpdateAlert"));

import { queryClient } from "@/lib/react-query";


const legacyRoutes = [
  { from: "/pdv", to: "/app/pdv" },
  { from: "/caixa", to: "/app/caixa" },
  { from: "/produtos", to: "/app/produtos" },
  { from: "/estoque", to: "/app/estoque" },
  { from: "/vendedores", to: "/app/vendedores" },
  { from: "/lojas", to: "/app/lojas" },
  { from: "/relatorios", to: "/app/relatorios" },
  { from: "/historico", to: "/app/vendas" },
  { from: "/configuracoes", to: "/app/configuracoes" },
  { from: "/assinatura", to: "/app/assinatura" },
  { from: "/ceo", to: "/app/ceo" },
  { from: "/fiscal", to: "/app/fiscal" },
  { from: "/carteira", to: "/app/carteira" },
  { from: "/comunidade", to: "/app/comunidade" },
  { from: "/financeiro", to: "/app/financeiro" },
  { from: "/contabilidade", to: "/app/contabilidade" },
  { from: "/crm", to: "/app/crm" },
  { from: "/fornecedores", to: "/app/fornecedores" },
  { from: "/bi", to: "/app/bi" },
  { from: "/agricultura", to: "/app/agricultura" },
  { from: "/avicultura", to: "/app/avicultura" },
];

const PageLoader = () => <GlobalFallback />;

const LoadingScreen = React.forwardRef<HTMLDivElement>((_, ref) => (
  <div
    ref={ref}
    className="min-h-screen bg-background flex flex-col items-center justify-center gap-4"
  >
    <Loader2 className="w-10 h-10 animate-spin text-primary" />
    <div className="flex flex-col items-center">
      <p className="text-sm font-bold tracking-tight text-primary">NAVANHULA CLOUD</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-60">Segurança Ativa</p>
    </div>
  </div>
));
LoadingScreen.displayName = "LoadingScreen";

const PROTECTED_ROUTE_FAILSAFE_MS = 8000;

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, role, company } = useAuth();
  const location = useLocation();
  const [failsafeExpired, setFailsafeExpired] = React.useState(false);

  const needsProfile = isAuthenticated && (!role || !isValidId(company?.id));

  React.useEffect(() => {
    if (!needsProfile) {
      setFailsafeExpired(false);
      return;
    }
    const t0 = performance.now();
    console.warn('[ProtectedRoute] Aguardando perfil/role/company...');
    const timer = setTimeout(() => {
      console.error(
        `[ProtectedRoute] FAILSAFE atingido após ${Math.round(performance.now() - t0)}ms — limpando sessão e redirecionando para /login`
      );
      try {
        supabase.auth.signOut().catch(() => {});
      } catch {}
      setFailsafeExpired(true);
    }, PROTECTED_ROUTE_FAILSAFE_MS);
    return () => clearTimeout(timer);
  }, [needsProfile]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || failsafeExpired) {
    return <Navigate to="/login" replace />;
  }

  if (needsProfile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Finalizando configuração segura...</p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">Se demorar mais que 8s será redirecionado ao login.</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4 text-xs"
          onClick={() => {
            supabase.auth.signOut().finally(() => {
              window.location.href = '/login';
            });
          }}
        >
          Voltar ao login
        </Button>
      </div>
    );
  }

  if (!canAccessRoute(location.pathname, role)) {
    return <Navigate to={getDefaultRouteForRole(role)} replace />;
  }

  return <>{children}</>;
};


const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to={getDefaultRouteForRole(role)} replace />;
  }

  return <>{children}</>;
};

const AppEntryRoute = () => {
  const { role } = useAuth();
  return <Navigate to={getDefaultRouteForRole(role)} replace />;
};

const AppRoutes = () => {
  const location = useLocation();

  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>

        <Route path="/" element={<Index />} />
        <Route path="/home" element={<Index />} />
        <Route path="/sobre" element={<AboutPage />} />
        <Route path="/precos" element={<PricingPage />} />
        <Route path="/recursos" element={<FeaturesPage />} />
        <Route path="/contato" element={<ContactPage />} />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthLoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/registrar"
          element={
            <PublicRoute>
              <AuthSignupPage />
            </PublicRoute>
          }
        />
        <Route path="/signup" element={<Navigate to="/registrar" replace />} />
        <Route path="/convite/:token" element={<InviteAcceptPage />} />
        <Route path="/onboarding" element={<Navigate to="/app/dashboard" replace />} />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <LocalPOSProvider>
                <SimulationProvider>
                  <MainLayout />
                </SimulationProvider>
              </LocalPOSProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<AppEntryRoute />} />
          <Route path="dashboard" element={<LocalDashboardPage />} />
          <Route path="dashboard/diretor" element={<DirectorDashboardPage />} />
          <Route path="dashboard/gestor" element={<ManagerDashboardPage />} />
          <Route path="dashboard/rh" element={<HRDashboardPage2 />} />
          <Route path="pdv" element={<SubscriptionGate><LocalPOSPage /></SubscriptionGate>} />
          <Route path="lojas" element={<SubscriptionGate><LocalStoresPage /></SubscriptionGate>} />
          <Route path="produtos" element={<SubscriptionGate><LocalProductsPage /></SubscriptionGate>} />
          <Route path="estoque" element={<SubscriptionGate><LocalInventoryPage /></SubscriptionGate>} />
          <Route path="vendas" element={<LocalSalesHistoryPage />} />
          <Route path="relatorios" element={<LocalReportsPage />} />
          <Route path="financeiro" element={<FinancialReportsPage />} />
          <Route path="financeiro-rh" element={<SubscriptionGate><FinanceHRUnifiedPage /></SubscriptionGate>} />
          <Route path="carteira" element={<SubscriptionGate><WalletPage /></SubscriptionGate>} />
          <Route path="pagamentos-manuais" element={<SubscriptionGate><ManualPaymentsPage /></SubscriptionGate>} />
          <Route path="configuracoes" element={<LocalSettingsPage />} />
          <Route path="comunidade" element={<CommunityPage />} />

          <Route path="caixa" element={<SubscriptionGate><LocalCashRegisterPage /></SubscriptionGate>} />
          <Route path="historico" element={<LocalSalesHistoryPage />} />
          <Route path="vendedores" element={<SubscriptionGate><LocalSellersPage /></SubscriptionGate>} />
          <Route path="assinatura" element={<SubscriptionPage />} />
          <Route path="ceo" element={<CEODashboardPage />} />
          <Route path="founder" element={<FounderGate><FounderLayout /></FounderGate>}>
            <Route index element={<FounderDashboardPage />} />
            <Route path="dashboard-global" element={<FounderGlobalDashboardPage />} />
            <Route path="empresas" element={<FounderCompaniesPage />} />
            <Route path="utilizadores" element={<FounderUsersPage />} />
            <Route path="assinaturas" element={<FounderSubscriptionsPage />} />
            <Route path="infraestrutura" element={<FounderBackupPage />} />
            <Route path="backup" element={<FounderBackupPage />} />
            <Route path="feature-flags" element={<FounderFeatureFlagsPage />} />
            <Route path="simulacao" element={<FounderSimulationPage />} />
            <Route path="auditoria" element={<FounderAuditPage />} />
            <Route path="health" element={<FounderHealthPage />} />
            <Route path="logs" element={<FounderLogsPage />} />
            <Route path="alertas" element={<FounderAlertsPage />} />
            <Route path="metricas" element={<FounderMetricsPage />} />
            <Route path="revenue" element={<FounderRevenuePage />} />
            <Route path="faturas" element={<FounderInvoicesPage />} />
            <Route path="configuracoes" element={<FounderSettingsPage />} />
          </Route>
          <Route path="fiscal" element={<FiscalPage />} />
          <Route path="contabilidade" element={<Navigate to="/app/financeiro-rh?tab=chart" replace />} />
          <Route path="crm" element={<SubscriptionGate><CRMPage /></SubscriptionGate>} />
          <Route path="fornecedores" element={<SubscriptionGate><SuppliersPage /></SubscriptionGate>} />
          <Route path="rh" element={<Navigate to="/app/financeiro-rh?tab=employees" replace />} />
          <Route path="tax-engine" element={<Navigate to="/app/financeiro-rh?tab=taxes" replace />} />
          <Route path="bi" element={<BIDashboardPage />} />

          <Route path="ai" element={<SubscriptionGate><AIBusinessEnginePage /></SubscriptionGate>} />
          <Route path="documentos" element={<SubscriptionGate><DocumentsCenterPage /></SubscriptionGate>} />
          <Route path="agricultura" element={<SubscriptionGate><AgriculturePage /></SubscriptionGate>} />
          <Route path="avicultura" element={<SubscriptionGate><PoultryPage /></SubscriptionGate>} />
          <Route path="avicultura/inteligencia" element={<SubscriptionGate><PoultryIntelligencePage /></SubscriptionGate>} />
          <Route path="ambiente" element={<SubscriptionGate><EnvironmentalDashboardPage /></SubscriptionGate>} />
          <Route path="agro-map" element={<SubscriptionGate><AgroMapPage /></SubscriptionGate>} />
          <Route path="agro-orders" element={<SubscriptionGate><AgroOrdersPage /></SubscriptionGate>} />
          <Route path="producer-dashboard" element={<SubscriptionGate><ProducerDashboardPage /></SubscriptionGate>} />
          <Route path="drivers" element={<SubscriptionGate><DriversPage /></SubscriptionGate>} />
          <Route path="criadores" element={<SubscriptionGate><CriadoresPage /></SubscriptionGate>} />
          <Route path="marketplace" element={<SubscriptionGate><MarketplacePage /></SubscriptionGate>} />
          <Route path="ecommerce" element={<SubscriptionGate><ECommercePage /></SubscriptionGate>} />
          <Route path="compliance" element={<SubscriptionGate><CompliancePage /></SubscriptionGate>} />
          <Route path="auditoria" element={<SystemAuditPage />} />
          <Route path="whatsapp" element={<SubscriptionGate><WhatsAppAutomationPage /></SubscriptionGate>} />
          <Route path="transferencias-stock" element={<SubscriptionGate><StockTransferPage /></SubscriptionGate>} />
          <Route path="estoque-filiais" element={<SubscriptionGate><BranchInventoryPage /></SubscriptionGate>} />
          <Route path="banco" element={<SubscriptionGate><BankAccountsPage /></SubscriptionGate>} />
          <Route path="relatorios-fiscais" element={<SubscriptionGate><TaxReportsPage /></SubscriptionGate>} />
          <Route path="equipa" element={<SubscriptionGate><CompanyUsersPage /></SubscriptionGate>} />
          <Route path="iam" element={<SubscriptionGate><IAMPage /></SubscriptionGate>} />
          <Route path="governanca" element={<SubscriptionGate><GovernancePage /></SubscriptionGate>} />
          <Route path="automacao" element={<SubscriptionGate><AutomationRulesPage /></SubscriptionGate>} />
          <Route path="api-keys" element={<SubscriptionGate><ApiKeysPage /></SubscriptionGate>} />
          <Route path="leads" element={<SubscriptionGate><LeadsPipelinePage /></SubscriptionGate>} />
          <Route path="tarefas" element={<SubscriptionGate><CrmTasksPage /></SubscriptionGate>} />
          <Route path="comercial/dashboard" element={<SubscriptionGate><CommercialDashboardPage /></SubscriptionGate>} />
          <Route path="crescimento" element={<SubscriptionGate><GrowthDashboardPage /></SubscriptionGate>} />
          <Route path="indicacoes" element={<ReferralPage />} />
          <Route path="revendedores" element={<Navigate to="/app/revendedores/dashboard" replace />} />
          <Route path="revendedores/dashboard" element={<ResellersNetworkPage />} />
          <Route path="revendedores/cadastrar" element={<ResellersNetworkPage />} />
          <Route path="revendedores/lista" element={<ResellersNetworkPage />} />
          <Route path="revendedores/comissoes" element={<ResellersNetworkPage />} />
          <Route path="revendedores/pagamentos" element={<ResellersNetworkPage />} />
          <Route path="revendedores/links" element={<ResellersNetworkPage />} />
          <Route path="revendedores/performance" element={<ResellersNetworkPage />} />
          <Route path="revendedores/materiais" element={<SalesMaterialsPage />} />
          <Route path="materiais-venda" element={<SalesMaterialsPage />} />
          <Route path="wms" element={<SubscriptionGate><WMSDashboard /></SubscriptionGate>} />
        </Route>


        {legacyRoutes.map((route) => (
          <Route key={route.from} path={route.from} element={<Navigate to={route.to} replace />} />
        ))}

        <Route path="*" element={<NotFound />} />
      </Routes>
      </AnimatePresence>
    </Suspense>
  );
};


const App = () => {
  // Global event listener for uncaught errors
  useEffect(() => {
    const handleError = async (event: ErrorEvent) => {
      console.error('[GlobalError]', event.error);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await supabase.from('system_errors').insert({
          user_id: session?.user?.id,
          error_message: event.message,
          error_stack: event.error?.stack,
          context: {
            url: window.location.href,
            userAgent: navigator.userAgent
          }
        });
      } catch (e) {
        console.error('Failed to log global error', e);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <I18nProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </I18nProvider>
        <Toaster />
        <Sonner position="top-right" />
        <EnterpriseDebugMonitor />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
