import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LocalPOSProvider } from "@/contexts/LocalPOSContext";
import { LocalAuthProvider, useLocalAuth } from "@/contexts/LocalAuthContext";

// LOCAL PAGES - 100% SYNCHRONOUS, NO BACKEND
import LocalDashboardPage from "./pages/LocalDashboardPage";
import LocalPOSPage from "./pages/LocalPOSPage";
import LocalProductsPage from "./pages/LocalProductsPage";
import LocalLoginPage from "./pages/LocalLoginPage";
import LocalSettingsPage from "./pages/LocalSettingsPage";
import LocalStoresPage from "./pages/LocalStoresPage";
import LocalSellersPage from "./pages/LocalSellersPage";
import LocalCashRegisterPage from "./pages/LocalCashRegisterPage";
import LocalInventoryPage from "./pages/LocalInventoryPage";
import LocalReportsPage from "./pages/LocalReportsPage";
import MainLayout from "./components/layout/MainLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useLocalAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// App Routes with Auth
const AppRoutes = () => {
  const { isAuthenticated } = useLocalAuth();

  return (
    <Routes>
      {/* Login - redirect to dashboard if already authenticated */}
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <LocalLoginPage />} 
      />
      
      {/* Protected Routes */}
      <Route element={
        <ProtectedRoute>
          <MainLayout />
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
        <LocalAuthProvider>
          <LocalPOSProvider>
            <AppRoutes />
          </LocalPOSProvider>
        </LocalAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
