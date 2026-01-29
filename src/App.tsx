import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LocalPOSProvider } from "@/contexts/LocalPOSContext";

// LOCAL PAGES - 100% SYNCHRONOUS, NO BACKEND
import LocalDashboardPage from "./pages/LocalDashboardPage";
import LocalPOSPage from "./pages/LocalPOSPage";
import LocalProductsPage from "./pages/LocalProductsPage";
import MainLayout from "./components/layout/MainLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// NO AUTH REQUIRED - IMMEDIATE ACCESS
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LocalPOSProvider>
          <Routes>
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Main app routes - NO AUTH, NO LOADING */}
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<LocalDashboardPage />} />
              <Route path="/pos" element={<LocalPOSPage />} />
              <Route path="/products" element={<LocalProductsPage />} />
              <Route path="/cash-register" element={<Navigate to="/pos" replace />} />
              <Route path="/inventory" element={<LocalProductsPage />} />
              <Route path="/reports" element={<LocalDashboardPage />} />
              <Route path="/users" element={<LocalDashboardPage />} />
              <Route path="/stores" element={<LocalDashboardPage />} />
              <Route path="/settings" element={<LocalDashboardPage />} />
            </Route>
            
            {/* Login redirects to dashboard */}
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </LocalPOSProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
