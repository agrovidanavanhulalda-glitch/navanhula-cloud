import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { SaaSAuthProvider, useAuth } from "@/contexts/SaaSAuthContext";
import { LocalPOSProvider } from "@/contexts/LocalPOSContext";
import { Loader2 } from "lucide-react";
import SubscriptionGate from "@/components/layout/SubscriptionGate";
import { getDefaultRouteForRole, canAccessRoute } from "@/lib/roleRoutes";

import AuthLoginPage from "./pages/AuthLoginPage";
import AuthSignupPage from "./pages/AuthSignupPage";
import LocalDashboardPage from "./pages/LocalDashboardPage";
import LocalPOSPage from "./pages/LocalPOSPage";
import LocalProductsPage from "./pages/LocalProductsPage";
import LocalSettingsPage from "./pages/LocalSettingsPage";
import LocalStoresPage from "./pages/LocalStoresPage";
import LocalSellersPage from "./pages/LocalSellersPage";
import LocalCashRegisterPage from "./pages/LocalCashRegisterPage";
import LocalInventoryPage from "./pages/LocalInventoryPage";
import LocalReportsPage from "./pages/LocalReportsPage";
import LocalSalesHistoryPage from "./pages/LocalSalesHistoryPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import CEODashboardPage from "./pages/CEODashboardPage";
import FiscalPage from "./pages/FiscalPage";
import WalletPage from "./pages/WalletPage";
import ManualPaymentsPage from "./pages/ManualPaymentsPage";
import CommunityPage from "./pages/CommunityPage";
import FinancialReportsPage from "./pages/FinancialReportsPage";
import CRMPage from "./pages/CRMPage";
import AccountingPage from "./pages/AccountingPage";
import SuppliersPage from "./pages/SuppliersPage";
import BIDashboardPage from "./pages/BIDashboardPage";
import AIBusinessEnginePage from "./pages/AIBusinessEnginePage";
import DocumentsCenterPage from "./pages/DocumentsCenterPage";
import AgriculturePage from "./pages/AgriculturePage";
import ECommercePage from "./pages/ECommercePage";
import PoultryPage from "./pages/PoultryPage";
import PoultryIntelligencePage from "./pages/PoultryIntelligencePage";
import EnvironmentalDashboardPage from "./pages/EnvironmentalDashboardPage";
import AgroMapPage from "./pages/AgroMapPage";
import AgroOrdersPage from "./pages/AgroOrdersPage";
import ProducerDashboardPage from "./pages/ProducerDashboardPage";
import DriversPage from "./pages/DriversPage";
import HRDashboardPage from "./pages/HRDashboardPage";
import CriadoresPage from "./pages/CriadoresPage";
import MarketplacePage from "./pages/MarketplacePage";
import CompliancePage from "./pages/CompliancePage";
import FinanceTaxEnginePage from "./pages/FinanceTaxEnginePage";
import SystemAuditPage from "./pages/SystemAuditPage";
import WhatsAppAutomationPage from "./pages/WhatsAppAutomationPage";
import FinanceHRUnifiedPage from "./pages/FinanceHRUnifiedPage";
import DirectorDashboardPage from "./pages/DirectorDashboardPage";
import ManagerDashboardPage from "./pages/ManagerDashboardPage";
import HRDashboardPage2 from "./pages/HRDashboardPage2";
import PublicSiteLayout from "./components/public/PublicSiteLayout";
import MainLayout from "./components/layout/MainLayout";
import Index from "./pages/Index";
import AboutPage from "./pages/AboutPage";
import PricingPage from "./pages/PricingPage";
import FeaturesPage from "./pages/FeaturesPage";
import ContactPage from "./pages/ContactPage";
import ResellersNetworkPage from "./pages/ResellersNetworkPage";
import StockTransferPage from "./pages/StockTransferPage";
import SalesMaterialsPage from "./pages/SalesMaterialsPage";
import BankAccountsPage from "./pages/BankAccountsPage";
import TaxReportsPage from "./pages/TaxReportsPage";
import CompanyUsersPage from "./pages/CompanyUsersPage";
import ApiKeysPage from "./pages/ApiKeysPage";
import IAMPage from "./pages/IAMPage";
import InviteAcceptPage from "./pages/InviteAcceptPage";
import NotFound from "./pages/NotFound";
import { I18nProvider } from "@/contexts/i18n";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

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

const LoadingScreen = React.forwardRef<HTMLDivElement>((_, ref) => (
  <div
    ref={ref}
    className="min-h-screen bg-background flex flex-col items-center justify-center gap-4"
  >
    <Loader2 className="w-10 h-10 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">NAVANHULA CLOUD...</p>
  </div>
));
LoadingScreen.displayName = "LoadingScreen";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Block access to routes not allowed for this role
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
  return (
    <Routes>
      <Route element={<PublicSiteLayout />}>
        <Route path="/" element={<Index />} />
        <Route path="/home" element={<Index />} />
        <Route path="/sobre" element={<AboutPage />} />
        <Route path="/precos" element={<PricingPage />} />
        <Route path="/recursos" element={<FeaturesPage />} />
        <Route path="/contato" element={<ContactPage />} />
      </Route>

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
              <MainLayout />
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
        <Route path="banco" element={<SubscriptionGate><BankAccountsPage /></SubscriptionGate>} />
        <Route path="relatorios-fiscais" element={<SubscriptionGate><TaxReportsPage /></SubscriptionGate>} />
        <Route path="equipa" element={<SubscriptionGate><CompanyUsersPage /></SubscriptionGate>} />
        <Route path="iam" element={<SubscriptionGate><IAMPage /></SubscriptionGate>} />
        <Route path="api-keys" element={<SubscriptionGate><ApiKeysPage /></SubscriptionGate>} />
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
      </Route>

      {legacyRoutes.map((route) => (
        <Route key={route.from} path={route.from} element={<Navigate to={route.to} replace />} />
      ))}

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SaaSAuthProvider>
            <AppRoutes />
          </SaaSAuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
