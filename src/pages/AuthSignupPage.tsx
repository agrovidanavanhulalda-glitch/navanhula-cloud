import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ShoppingCart, UserPlus, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * AuthSignupPage - Signup with proper validation and error handling
 */

const AuthSignupPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { signUp, isAuthenticated, onboardingCompleted, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect based on auth state
  useEffect(() => {
    if (!loading && isAuthenticated) {
      console.log('[Signup] User authenticated, redirecting...');
      if (onboardingCompleted) {
        navigate('/', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [loading, isAuthenticated, onboardingCompleted, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validations
    if (!fullName.trim()) {
      setError('Nome completo é obrigatório');
      return;
    }

    if (!email.trim()) {
      setError('Email é obrigatório');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setIsLoading(true);
    console.log('[Signup] Creating account for:', email);
    
    try {
      await signUp(email, password, fullName);
      // User needs to verify email, show message
      toast.info('Verifique seu email para ativar sua conta.');
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro ao criar conta';
      console.error('[Signup] Error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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

      {/* Signup card */}
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-2 mb-6">
          <UserPlus className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Criar Conta</h2>
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
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Seu nome completo"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setError(null);
              }}
              required
              autoComplete="name"
              disabled={isLoading}
            />
          </div>

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
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              required
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Digite a senha novamente"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError(null);
              }}
              required
              autoComplete="new-password"
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
                Criando conta...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5 mr-2" />
                Criar Conta
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Entrar
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

export default AuthSignupPage;
