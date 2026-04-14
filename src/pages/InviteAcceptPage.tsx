import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, UserPlus, Loader2, AlertTriangle, CheckCircle2, XCircle, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { validatePassword } from '@/lib/passwordValidation';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador', manager: 'Gestor', seller: 'Vendedor', cashier: 'Caixa',
};

const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [invite, setInvite] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  // Signup form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Load invite
  useEffect(() => {
    if (!token) return;
    (async () => {
      // Use secure RPC to look up invitation by exact token (no enumeration possible)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_invitation_by_token', { p_token: token });
      const invitation = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (rpcError || !invitation) {
        setError('Convite inválido ou expirado.');
        setLoadingInvite(false);
        return;
      }
      setInvite(invitation);
      // Fetch company name separately
      if (invitation.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('name')
          .eq('id', invitation.company_id)
          .maybeSingle();
        setCompany(companyData);
      }
      setLoadingInvite(false);
    })();
  }, [token]);

  // If already authenticated, accept directly
  useEffect(() => {
    if (isAuthenticated && invite && !accepted) {
      acceptInvite();
    }
  }, [isAuthenticated, invite]);

  useEffect(() => {
    if (password.length > 0) {
      setPasswordErrors(validatePassword(password).errors);
    } else {
      setPasswordErrors([]);
    }
  }, [password]);

  const acceptInvite = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('accept_company_invitation', { p_token: token! });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.message || 'Erro ao aceitar convite');
      setAccepted(true);
      toast.success('Convite aceite com sucesso!');
      setTimeout(() => navigate('/app/dashboard', { replace: true }), 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao aceitar convite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) { setError('Nome completo é obrigatório'); return; }
    const validation = validatePassword(password);
    if (!validation.isValid) { setError('A senha não atende aos requisitos'); return; }
    if (password !== confirmPassword) { setError('As senhas não coincidem'); return; }

    setIsSubmitting(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (signUpError) throw signUpError;
      toast.info('Verifique seu email para ativar a conta e depois acesse o link de convite novamente.');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInvite || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <CheckCircle2 className="w-16 h-16 text-emerald-500" />
        <h1 className="text-2xl font-bold">Bem-vindo à equipa!</h1>
        <p className="text-muted-foreground">A redirecionar para o dashboard...</p>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <AlertTriangle className="w-16 h-16 text-destructive" />
        <h1 className="text-xl font-bold">Convite Inválido</h1>
        <p className="text-muted-foreground">{error}</p>
        <Link to="/login"><Button>Ir para Login</Button></Link>
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
        <p className="text-muted-foreground mt-2">Convite para Equipa</p>
      </div>

      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <span className="font-semibold text-lg">{company?.name || 'Empresa'}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Você foi convidado como <Badge variant="default">{ROLE_LABELS[invite?.role] || invite?.role}</Badge>
          </p>
        </div>

        {isAuthenticated ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">Clique abaixo para aceitar o convite</p>
            <Button onClick={acceptInvite} disabled={isSubmitting} className="w-full h-12">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
              Aceitar Convite
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Criar Conta</h2>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input value={fullName} onChange={e => { setFullName(e.target.value); setError(null); }} placeholder="Seu nome" required disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(null); }} placeholder="seu@email.com" required disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(null); }} placeholder="Senha forte" required disabled={isSubmitting} />
                {password.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {['Mínimo 8 caracteres', 'Pelo menos 1 letra maiúscula', 'Pelo menos 1 letra minúscula', 'Pelo menos 1 número', 'Pelo menos 1 caractere especial (!@#$%...)'].map(rule => {
                      const passed = !passwordErrors.includes(rule);
                      return (
                        <div key={rule} className={`flex items-center gap-1.5 text-xs ${passed ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {rule}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Confirmar Senha</Label>
                <Input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(null); }} placeholder="Digite novamente" required disabled={isSubmitting} />
              </div>
              <Button type="submit" className="w-full h-12" disabled={isSubmitting || passwordErrors.length > 0}>
                {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Criando...</> : <><UserPlus className="w-5 h-5 mr-2" />Criar Conta</>}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Já tem conta? <Link to="/login" className="text-primary hover:underline font-medium">Entrar</Link> e depois acesse o link novamente.
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default InviteAcceptPage;
