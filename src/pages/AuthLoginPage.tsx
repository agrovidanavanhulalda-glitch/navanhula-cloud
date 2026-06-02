import React, { useState, useEffect } from 'react';
import { useAppVersion } from '@/hooks/useAppVersion';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getDefaultRouteForRole } from '@/lib/roleRoutes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { LogIn, Loader2, AlertTriangle, ShieldCheck, Sparkles, Eye, EyeOff } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';

const AuthLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { currentVersion } = useAppVersion();

  const { signIn, isAuthenticated, loading, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

  useEffect(() => {
    // Handle recovery session
    const checkRecovery = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // If we have a recovery session, show change password directly
      if (session && window.location.hash.includes('type=recovery')) {
        setShowChangePassword(true);
        toast.info('Por favor, defina uma nova senha para sua conta');
      }
    };
    checkRecovery();

    if (!loading && isAuthenticated && !showChangePassword) {
      navigate(redirect || getDefaultRouteForRole(role), { replace: true });
    }
  }, [loading, isAuthenticated, role, navigate, showChangePassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (showChangePassword) {
      if (!newPassword.trim() || newPassword.length < 6) {
        setError('A nova senha deve ter pelo menos 6 caracteres');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('As senhas não coincidem');
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const { error: updateError } = await supabase.auth.updateUser({ 
          password: newPassword.trim() 
        });
        
        if (updateError) throw updateError;
        
        toast.success('Senha atualizada com sucesso!');
        navigate(redirect || getDefaultRouteForRole(role), { replace: true });
      } catch (err: any) {
        setError(err?.message || 'Erro ao atualizar senha');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Email e senha são obrigatórios');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password: password.trim() 
      });

      if (signInError) throw signInError;

      // Check if temporary password was used
      if (password.trim() === 'NAV@12345') {
        setShowChangePassword(true);
        toast.info('Por segurança, altere sua senha temporária');
        setIsLoading(false);
        return;
      }

      // If not temporary, let useEffect handle navigation
    } catch (err: any) {
      setError(err?.message || 'Erro ao fazer login');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError('O e-mail é obrigatório');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      
      if (resetError) throw resetError;
      
      toast.success('Instruções de redefinição enviadas para seu e-mail');
      setShowForgotPassword(false);
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar e-mail de redefinição');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-premium flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
        <p className="text-sm text-primary-foreground/70">Verificando sessão...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-gradient-premium">
      {/* Ambient glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 20% 20%, hsl(var(--primary) / 0.35), transparent 60%), radial-gradient(ellipse 50% 40% at 85% 85%, hsl(var(--gold) / 0.18), transparent 60%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--gold)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="relative mx-auto mb-5 inline-flex">
            <BrandLogo width={200} glow priority className="md:w-[240px] lg:w-[280px]" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-primary-foreground">
            NAVANHULA <span className="text-gradient-gold">CLOUD</span>
          </h1>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-primary-foreground/60">
            ENTERPRISE SYSTEM
          </p>
        </div>

        {/* Login card — frosted premium */}
        <Card className="relative overflow-hidden border border-gold/20 bg-card/95 p-8 backdrop-blur-xl shadow-premium">
          {/* Top gold accent line */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--gold) / 0.8), transparent)' }}
          />

          <div className="mb-6 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-gold">
              <ShieldCheck className="h-5 w-5 text-gold-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Entrar no Sistema</h2>
              <p className="text-xs text-muted-foreground">Use o seu e-mail e senha para começar</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgotEmail" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Seu E-mail
                </Label>
                <Input
                  id="forgotEmail"
                  type="email"
                  placeholder="seu@empresa.com"
                  value={forgotEmail}
                  onChange={(e) => { setForgotEmail(e.target.value); setError(null); }}
                  required
                  disabled={isLoading}
                  className="h-14 text-lg"
                />
              </div>
              <Button
                type="submit"
                className="h-14 w-full text-lg font-bold shadow-lg glow-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  'ENVIAR INSTRUÇÕES'
                )}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full text-xs" 
                onClick={() => setShowForgotPassword(false)}
                disabled={isLoading}
              >
                Voltar ao login
              </Button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!showChangePassword ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@empresa.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    required
                    autoComplete="email"
                    disabled={isLoading}
                    className="h-14 text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      required
                      autoComplete="current-password"
                      disabled={isLoading}
                      className="h-14 text-lg pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nova Senha Definida
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Sua nova senha segura"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                    required
                    disabled={isLoading}
                    className="h-14 text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Confirmar Nova Senha
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                    required
                    disabled={isLoading}
                    className="h-14 text-lg"
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              className="h-14 w-full text-lg font-bold shadow-lg glow-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {showChangePassword ? 'Atualizando...' : 'Entrando...'}
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  {showChangePassword ? 'DEFINIR E ENTRAR' : 'ENTRAR AGORA'}
                </>
              )}
            </Button>
            
            {showChangePassword && (
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full text-xs" 
                onClick={() => setShowChangePassword(false)}
                disabled={isLoading}
              >
                Voltar ao login
              </Button>
            )}
          </form>
          )}

          <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Novo por aqui?{' '}
                <Link to="/registrar" className="font-semibold text-primary hover:underline">
                  Criar minha conta
                </Link>
              </p>
          </div>
        </Card>

        {/* Trust badges */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-primary-foreground/60">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-gold" /> Conexão Protegida</span>
          <span className="h-3 w-px bg-primary-foreground/20" />
          <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-gold" /> Segurança Total</span>
        </div>

        <p className="mt-6 text-center text-xs text-primary-foreground/50">
          © 2026 Navanhula Group Lda · Todos os direitos reservados
          {currentVersion && <span className="block mt-1 opacity-60 italic">v{currentVersion}</span>}
        </p>
      </div>
    </div>
  );
};

export default AuthLoginPage;
