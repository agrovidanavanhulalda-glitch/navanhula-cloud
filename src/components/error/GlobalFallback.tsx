import React from 'react';
import { Loader2 } from 'lucide-react';

export const GlobalFallback: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <div className="relative">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-primary rounded-full" />
        </div>
      </div>
      <div className="flex flex-col items-center">
        <p className="text-lg font-bold tracking-tight">NAVANHULA CLOUD</p>
        <p className="text-xs text-muted-foreground uppercase tracking-widest opacity-70">A carregar recursos...</p>
      </div>
    </div>
  );
};
