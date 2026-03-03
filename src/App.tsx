import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SaaSAuthProvider, useAuth } from "@/contexts/SaaSAuthContext";
import { LocalPOSProvider } from "@/contexts/LocalPOSContext";
import { Loader2 } from "lucide-react";

// Auth pages
import AuthLoginPage from "./pages/AuthLoginPage";
import AuthSignupPage from "./pages/AuthSignupPage";

// Main app pages
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
import CommunityPage from "./pages/CommunityPage";
import FinancialReportsPage from "./pages/FinancialReportsPage";
import CRMPage from "./pages/CRMPage";
import AccountingPage from "./pages/AccountingPage";
import SuppliersPage from "./pages/SuppliersPage";
import BIDashboardPage from "./pages/BIDashboardPage";
import AgriculturePage from "./pages/AgriculturePage";
import PoultryPage from "./pages/PoultryPage";
import MainLayout from "./components/layout/MainLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

/**
 * Loading Screen - shows for max 2 seconds
 */
const LoadingScreen = React.forwardRef<HTMLDivElement>((_, ref) => (
  <div 
    ref={ref} 
    className="min-h-screen bg-background flex flex-col items-center justify-center gap-4"
  >
    <Loader2 className="w-10 h-10 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">NAVANHULA POS...</p>
  </div>
));
LoadingScreen.displayName = "LoadingScreen";

/**
 * Protected Route - requires authentication only (NO onboarding check)
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  console.log('[Route] Protected:', { loading, isAuthenticated });
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    console.log('[Route] → /login');
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

/**
 * Public Route - redirects authenticated users to dashboard
 */
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  console.log('[Route] Public:', { loading, isAuthenticated });
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (isAuthenticated) {
    console.log('[Route] Authenticated → /');
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

/**
 * App Routes - SIMPLIFIED (no onboarding)
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <AuthLoginPage />
          </PublicRoute>
        } 
      />
      <Route 
        path="/signup" 
        element={
          <PublicRoute>
            <AuthSignupPage />
          </PublicRoute>
        } 
      />
      
      {/* Onboarding route - redirect to dashboard */}
      <Route path="/onboarding" element={<Navigate to="/" replace />} />
      
      {/* Protected Routes */}
      <Route element={
        <ProtectedRoute>
          <LocalPOSProvider>
            <MainLayout />
          </LocalPOSProvider>
        </ProtectedRoute>
      }>
        <Route path="/" element={<LocalDashboardPage />} />
        <Route path="/pdv" element={<LocalPOSPage />} />
        <Route path="/caixa" element={<LocalCashRegisterPage />} />
        <Route path="/produtos" element={<LocalProductsPage />} />
        <Route path="/estoque" element={<LocalInventoryPage />} />
        <Route path="/vendedores" element={<LocalSellersPage />} />
        <Route path="/lojas" element={<LocalStoresPage />} />
        <Route path="/relatorios" element={<LocalReportsPage />} />
        <Route path="/historico" element={<LocalSalesHistoryPage />} />
        <Route path="/configuracoes" element={<LocalSettingsPage />} />
        <Route path="/assinatura" element={<SubscriptionPage />} />
        <Route path="/ceo" element={<CEODashboardPage />} />
        <Route path="/fiscal" element={<FiscalPage />} />
        <Route path="/carteira" element={<WalletPage />} />
        <Route path="/comunidade" element={<CommunityPage />} />
        <Route path="/financeiro" element={<FinancialReportsPage />} />
        <Route path="/contabilidade" element={<AccountingPage />} />
        <Route path="/crm" element={<CRMPage />} />
        <Route path="/fornecedores" element={<SuppliersPage />} />
        <Route path="/bi" element={<BIDashboardPage />} />
        <Route path="/agricultura" element={<AgriculturePage />} />
        <Route path="/avicultura" element={<PoultryPage />} />
      </Route>
      
      {/* Catch all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SaaSAuthProvider>
          <AppRoutes />
        </SaaSAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
