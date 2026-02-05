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
import OnboardingPage from "./pages/OnboardingPage";

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
 * Loading Screen - shows for max 3 seconds
 * Uses forwardRef to avoid React Router ref warning
 */
const LoadingScreen = React.forwardRef<HTMLDivElement>((_, ref) => (
  <div 
    ref={ref} 
    className="min-h-screen bg-background flex flex-col items-center justify-center gap-4"
  >
    <Loader2 className="w-10 h-10 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">Carregando NAVANHULA POS...</p>
  </div>
));
LoadingScreen.displayName = "LoadingScreen";

/**
 * Protected Route - requires authentication AND completed onboarding
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, onboardingCompleted, loading } = useAuth();
  
  console.log('[Route] Protected check:', { loading, isAuthenticated, onboardingCompleted });
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    console.log('[Route] Not authenticated → /login');
    return <Navigate to="/login" replace />;
  }
  
  if (!onboardingCompleted) {
    console.log('[Route] No onboarding → /onboarding');
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
};

/**
 * Onboarding Route - requires authentication but NOT completed onboarding
 */
const OnboardingRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, onboardingCompleted, loading } = useAuth();
  
  console.log('[Route] Onboarding check:', { loading, isAuthenticated, onboardingCompleted });
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    console.log('[Route] Not authenticated → /login');
    return <Navigate to="/login" replace />;
  }
  
  // If already completed onboarding, go to dashboard
  if (onboardingCompleted) {
    console.log('[Route] Already onboarded → /');
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

/**
 * Public Route - redirects authenticated users appropriately
 */
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, onboardingCompleted, loading } = useAuth();
  
  console.log('[Route] Public check:', { loading, isAuthenticated, onboardingCompleted });
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (isAuthenticated) {
    if (onboardingCompleted) {
      console.log('[Route] Authenticated + onboarded → /');
      return <Navigate to="/" replace />;
    } else {
      console.log('[Route] Authenticated, no onboarding → /onboarding');
      return <Navigate to="/onboarding" replace />;
    }
  }
  
  return <>{children}</>;
};

/**
 * App Routes with proper guards
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes - Login and Signup */}
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
      
      {/* Onboarding route - authenticated but no company yet */}
      <Route 
        path="/onboarding" 
        element={
          <OnboardingRoute>
            <OnboardingPage />
          </OnboardingRoute>
        } 
      />
      
      {/* Protected Routes - authenticated AND onboarding completed */}
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
        <Route path="/configuracoes" element={<LocalSettingsPage />} />
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
