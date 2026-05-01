import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ShoppingCart, UserPlus, Loader2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { validatePassword } from '@/lib/passwordValidation';

const AuthSignupPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  
  const { signUp, isAuthenticated, loading, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = (searchParams.get('ref') || '').trim().toUpperCase();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(role === 'reseller' ? '/app/revendedores/dashboard' : '/app/dashboard', { replace: true });
    }
  }, [loading, isAuthenticated, role, navigate]);

  // Live password validation
  useEffect(() => {
    if (password.length > 0) {
      const result = validatePassword(password);
      setPasswordErrors(result.errors);
    } else {
      setPasswordErrors([]);
    }
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!fullName.trim()) { setError('Nome completo é obrigatório'); return; }
    if (!email.trim()) { setError('Email é obrigatório'); return; }

    const validation = validatePassword(password);
    if (!validation.isValid) {
      setError('A senha não atende aos requisitos de segurança');
      return;
    }
    
    if (password !== confirmPassword) { setError('As senhas não coincidem'); return; }

    setIsLoading(true);
    try {
      await signUp(email, password, fullName, referralCode || undefined);
      toast.info('Verifique seu email para ativar sua conta.');
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar conta');
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
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-primary">NAVANHULA CLOUD</h1>
        <p className="text-muted-foreground mt-2">Gestão simples para o seu negócio</p>
      </div>

      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-2 mb-6">
          <UserPlus className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Começar Agora</h2>
        </div>

        {referralCode ? (
          <div className="mb-4 p-3 rounded-lg border border-primary/20 bg-primary/10 text-sm text-foreground">
            Cadastro com indicação ativa: <span className="font-semibold">{referralCode}</span>
          </div>
        ) : null}

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input id="fullName" type="text" placeholder="Como você se chama?" value={fullName} onChange={(e) => { setFullName(e.target.value); setError(null); }} required autoComplete="name" disabled={isLoading} className="h-14 text-lg" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} required autoComplete="email" disabled={isLoading} className="h-14 text-lg" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" placeholder="Crie uma senha segura" value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} required autoComplete="new-password" disabled={isLoading} className="h-14 text-lg" />
            {password.length > 0 && (
              <div className="space-y-1 mt-2">
                {['Mínimo 8 caracteres', 'Pelo menos 1 letra maiúscula', 'Pelo menos 1 letra minúscula', 'Pelo menos 1 número', 'Pelo menos 1 caractere especial (!@#$%...)'].map((rule) => {
                  const passed = !passwordErrors.includes(rule);
                  return (
                    <div key={rule} className={`flex items-center gap-1.5 text-xs ${passed ? 'text-success' : 'text-muted-foreground'}`}>
                      {passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {rule}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input id="confirmPassword" type="password" placeholder="Digite a senha novamente" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }} required autoComplete="new-password" disabled={isLoading} className="h-14 text-lg" />
          </div>

          <Button type="submit" className="w-full h-14 text-lg font-bold" disabled={isLoading || passwordErrors.length > 0}>
            {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin mr-2" />Criando conta...</>) : (<><UserPlus className="w-5 h-5 mr-2" />Criar Conta</>)}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">Entrar</Link>
          </p>
        </div>
      </Card>

      <p className="text-sm text-muted-foreground mt-8">© 2026 Navanhula Group Lda. Todos os direitos reservados.</p>
    </div>
  );
};

export default AuthSignupPage;
