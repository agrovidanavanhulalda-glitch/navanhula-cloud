import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Error caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <ShieldAlert className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold mb-3 tracking-tight">Oops! Algo correu mal.</h1>
          <p className="text-muted-foreground max-w-md mb-8">
            O sistema encontrou um erro inesperado. Por favor, tente recarregar a página ou voltar ao início.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <Button 
              onClick={() => window.location.reload()}
              className="w-full gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar Página
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="w-full gap-2"
            >
              <Home className="w-4 h-4" />
              Voltar ao Início
            </Button>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-12 p-4 bg-muted rounded-lg text-left overflow-auto max-w-3xl w-full">
              <p className="font-mono text-xs text-destructive">{this.state.error?.toString()}</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
