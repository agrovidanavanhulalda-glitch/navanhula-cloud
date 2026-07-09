import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * FounderGate — Blocks access to `/app/founder/*` for anyone who is
 * not flagged as a NAVANHULA CLOUD founder (profiles.is_founder = true
 * or account_type = 'FOUNDER'). Non-founders are redirected to /app.
 */
export const FounderGate: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isFounder, loading, appReady } = useAuth();

  if (loading || !appReady) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isFounder) return <Navigate to="/app" replace />;

  return <>{children ?? <Outlet />}</>;
};

export default FounderGate;
