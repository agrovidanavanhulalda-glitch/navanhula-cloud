import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, UserPlus, Loader2, AlertTriangle, CheckCircle2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, signIn } = useAuth();

  const [invite, setInvite] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load invite
  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoadingInvite(true);
      try {
        const { data, error: rpcError } = await supabase.rpc('get_invite_details', { p_token: token });
        
        if (rpcError || !data || data.length === 0) {
          setError('Convite inválido, expirado ou já utilizado.');
          return;
        }

        const inviteData = data[0];
        setInvite(inviteData);
        setCompany({ name: inviteData.company_name });
      } catch (err) {
        setError('Ocorreu um erro ao verificar o convite.');
      } finally {
        setLoadingInvite(false);
      }
    })();
  }, [token]);

  const acceptInvite = async () => {
    setIsSubmitting(true);
    try {
      if (!isAuthenticated) {
        toast.error('Você precisa estar logado para aceitar o convite.');
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('accept_invite_secure', { p_token: token! });
      
      if (rpcError) throw rpcError;
      
      const result = data as any;
      if (!result?.success) throw new Error(result?.message || 'Erro ao aceitar convite');
      
      setAccepted(true);
      toast.success('Bem-vindo à equipa!');
      
      // Refresh user data in context to update company and role
      // No need for a fake sign in, we'll use window.location.href to force a clean state reload
      // which is safest for multi-tenant switching.
      
      setTimeout(() => {
        window.location.href = '/app/dashboard'; // Force reload to ensure all contexts are updated
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao aceitar convite');
      toast.error(err.message);
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4 text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce" />
        <h1 className="text-2xl font-bold">Bem-vindo à equipa!</h1>
        <p className="text-muted-foreground">A configurar o seu acesso...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4 text-center">
        <AlertTriangle className="w-16 h-16 text-destructive" />
        <h1 className="text-xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground">{error}</p>
        <Link to="/login"><Button variant="outline">Ir para Login</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-[#0B3C5D]">NAVANHULA CLOUD</h1>
        <p className="text-muted-foreground mt-2 font-medium">Gestão Empresarial Inteligente</p>
      </div>

      <Card className="w-full max-w-md p-8 shadow-xl border-t-4 border-t-[#0B3C5D]">
        <div className="text-center mb-8 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0B3C5D]/10 text-[#0B3C5D] mb-2">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{company?.name || 'Empresa'}</h2>
            <p className="text-gray-500 mt-1">Convidou você para fazer parte da equipa</p>
          </div>
          <div className="flex flex-col gap-2 items-center">
            <Badge className="bg-[#1E5A8A] text-white px-4 py-1">
              Cargo: {invite?.role_name || 'Membro'}
            </Badge>
            {invite?.branch_name && (
              <Badge variant="outline" className="border-[#0B3C5D] text-[#0B3C5D]">
                Unidade: {invite.branch_name}
              </Badge>
            )}
          </div>
        </div>

        {isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-sm text-center text-gray-600 mb-6">
              Você está conectado. Clique abaixo para vincular sua conta a esta empresa.
            </p>
            <Button 
              onClick={acceptInvite} 
              disabled={isSubmitting} 
              className="w-full h-12 bg-[#0B3C5D] hover:bg-[#1E5A8A] text-white transition-all shadow-md"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
              Aceitar Convite e Entrar
            </Button>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <p className="text-gray-600">
              Para aceitar o convite, você precisa fazer login ou criar uma conta primeiro.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Link to={`/login?redirect=/convite/${token}`} className="w-full">
                <Button variant="outline" className="w-full h-12">Login</Button>
              </Link>
              <Link to={`/registrar?redirect=/convite/${token}`} className="w-full">
                <Button className="w-full h-12 bg-[#0B3C5D]">Criar Conta</Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default InviteAcceptPage;
