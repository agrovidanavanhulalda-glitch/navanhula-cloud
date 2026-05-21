import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RefreshCw, Home, Terminal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  reported: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    reported: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, reported: false };
  }

  public async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Critical Error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Auto-report to database
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      await supabase.from('system_errors').insert({
        user_id: session?.user?.id,
        error_message: error.message,
        error_stack: error.stack,
        component_name: errorInfo.componentStack?.split('\n')[1]?.trim(),
        url: window.location.href,
        user_agent: navigator.userAgent
      });
      
      this.setState({ reported: true });
    } catch (reportError) {
      console.error('[ErrorBoundary] Failed to report error:', reportError);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, reported: false });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background select-none">
          <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mb-8 rotate-3 hover:rotate-0 transition-transform duration-500">
            <ShieldAlert className="w-10 h-10 text-destructive" />
          </div>
          
          <div className="space-y-2 mb-8">
            <h1 className="text-3xl font-black tracking-tighter text-foreground sm:text-4xl">
              SISTEMA PROTEGIDO
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto text-sm sm:text-base font-medium">
              O NAVANHULA CLOUD interceptou uma falha crítica para proteger a integridade dos seus dados.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs mb-12">
            <Button 
              onClick={this.handleReset}
              className="w-full gap-2 shadow-lg shadow-primary/20 h-11"
            >
              <RefreshCw className="w-4 h-4" />
              Recuperar Sistema
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/app/dashboard'}
              className="w-full gap-2 h-11"
            >
              <Home className="w-4 h-4" />
              Painel Principal
            </Button>
          </div>

          <div className="w-full max-w-2xl bg-secondary/30 rounded-2xl border border-border/50 p-6 text-left backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Terminal className="w-3.5 h-3.5" />
              Relatório Técnico {this.state.reported && <span className="text-success ml-auto">Enviado com sucesso</span>}
            </div>
            
            <div className="space-y-4 font-mono text-[11px] leading-relaxed">
              <div className="p-3 bg-destructive/5 border border-destructive/10 rounded-lg">
                <p className="text-destructive font-bold mb-1">ERRO:</p>
                <p className="text-foreground break-all">{this.state.error?.message || 'Erro indefinido'}</p>
              </div>
              
              {this.state.errorInfo && (
                <div className="p-3 bg-background/50 rounded-lg border border-border/50 max-h-[150px] overflow-auto custom-scrollbar">
                  <p className="text-muted-foreground font-bold mb-1 uppercase text-[9px]">Stack Trace:</p>
                  <pre className="text-muted-foreground/80 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </div>
          
          <p className="mt-8 text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold opacity-40">
            Segurança Ativa &bull; Navanhula Cloud Enterprise
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
