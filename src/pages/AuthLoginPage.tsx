import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ShoppingCart, Store, LogIn, Loader2, AlertTriangle } from 'lucide-react';

/**
 * AuthLoginPage - Login page with proper error handling
 * 
 * REGRAS:
 * 1. Nunca mostrar loading infinito
 * 2. Erros claros e visíveis
 * 3. Navegação baseada no estado do auth
 */

const AuthLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { signIn, isAuthenticated, onboardingCompleted, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      console.log('[Login] User authenticated, redirecting...');
      navigate('/app/dashboard', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      setError('Email e senha são obrigatórios');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    console.log('[Login] Attempting login for:', email);
    
    try {
      await signIn(email, password);
      // Navigation will be handled by useEffect after auth state updates
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro ao fazer login';
      console.error('[Login] Error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show brief loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verificando sessão...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Logo and branding */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-primary">NAVANHULA POS</h1>
        <p className="text-muted-foreground mt-2">Sistema de Ponto de Venda</p>
      </div>

      {/* Login card */}
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-2 mb-6">
          <Store className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Entrar no Sistema</h2>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              required
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Entrar
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Ainda não tem conta?{' '}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Criar conta
            </Link>
          </p>
        </div>
      </Card>

      {/* Footer */}
      <p className="text-sm text-muted-foreground mt-8">
        © 2024 NAVANHULA POS. Todos os direitos reservados.
      </p>
    </div>
  );
};

export default AuthLoginPage;
