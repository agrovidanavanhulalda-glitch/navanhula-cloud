import React, { useState, useEffect } from 'react';
import { useAppVersion } from '@/hooks/useAppVersion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentVersion } = useAppVersion();

  const { signIn, isAuthenticated, loading, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(getDefaultRouteForRole(role), { replace: true });
    }
  }, [loading, isAuthenticated, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Email e senha são obrigatórios');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err?.message || 'Erro ao fazer login');
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
            <BrandLogo width={160} glow priority />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-primary-foreground">
            NAVANHULA <span className="text-gradient-gold">CLOUD</span>
          </h1>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-primary-foreground/60">
            Gestão simples para o seu negócio
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

          <form onSubmit={handleSubmit} className="space-y-4">
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
            </div>

            <Button
              type="submit"
              className="h-14 w-full text-lg font-bold shadow-lg glow-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  ENTRAR AGORA
                </>
              )}
            </Button>
          </form>

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
