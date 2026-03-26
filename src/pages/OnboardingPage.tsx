import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart, Building2, Loader2, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * OnboardingPage - Creates company for new users
 * 
 * REGRAS:
 * 1. Formulário simples e direto
 * 2. Botão desabilitado durante submit
 * 3. Erro = mensagem clara + parar spinner
 * 4. Sucesso = navegação explícita para /
 */

const OnboardingPage: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [companyNif, setCompanyNif] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { completeOnboarding, onboardingCompleted, isAuthenticated, loading, user, refreshUserData } = useAuth();
  const navigate = useNavigate();

  // Redirect if already completed onboarding
  useEffect(() => {
    if (!loading && isAuthenticated && onboardingCompleted) {
      console.log('[Onboarding] Already completed, redirecting to /');
      navigate('/', { replace: true });
    }
  }, [loading, isAuthenticated, onboardingCompleted, navigate]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('[Onboarding] Not authenticated, redirecting to /login');
      navigate('/login', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const trimmedName = companyName.trim();
    if (!trimmedName) {
      setError('Nome da empresa é obrigatório');
      toast.error('Nome da empresa é obrigatório');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    console.log('[Onboarding] Submitting company:', trimmedName);

    try {
      await completeOnboarding({
        companyName: trimmedName,
        companyNif: companyNif.trim() || undefined,
        companyPhone: companyPhone.trim() || undefined,
        companyAddress: companyAddress.trim() || undefined,
      });
      
      console.log('[Onboarding] Company created successfully');
      
      // Refresh to confirm onboarding completed
      await refreshUserData();
      
      // Explicit navigation to dashboard
      console.log('[Onboarding] Navigating to dashboard');
      navigate('/', { replace: true });
      
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro desconhecido ao criar empresa';
      console.error('[Onboarding] Error:', errorMessage);
      setError(errorMessage);
      // Toast is already shown in completeOnboarding
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading only briefly
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
        <h1 className="text-3xl font-bold text-primary">NAVANHULA CLOUD</h1>
        <p className="text-muted-foreground mt-2">Sistema Empresarial</p>
      </div>

      {/* Onboarding card */}
      <Card className="w-full max-w-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Configure sua Empresa</h2>
            <p className="text-sm text-muted-foreground">
              Olá, {user?.full_name || 'Usuário'}! Vamos configurar sua empresa.
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Conta criada</span>
          </div>
          <div className="flex-1 h-0.5 bg-primary" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
              2
            </div>
            <span className="text-sm font-medium">Configurar empresa</span>
          </div>
          <div className="flex-1 h-0.5 bg-muted" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium">
              3
            </div>
            <span className="text-sm text-muted-foreground">Pronto!</span>
          </div>
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
            <Label htmlFor="companyName">Nome da Empresa *</Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Ex: Loja do João"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                setError(null);
              }}
              required
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyNif">NIF / NUIT (opcional)</Label>
            <Input
              id="companyNif"
              type="text"
              placeholder="Número de identificação fiscal"
              value={companyNif}
              onChange={(e) => setCompanyNif(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyPhone">Telefone (opcional)</Label>
            <Input
              id="companyPhone"
              type="tel"
              placeholder="Ex: +258 84 123 4567"
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyAddress">Endereço (opcional)</Label>
            <Textarea
              id="companyAddress"
              placeholder="Endereço completo da empresa"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              rows={2}
              disabled={isSubmitting}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg mt-6"
            disabled={isSubmitting || !companyName.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Criando empresa...
              </>
            ) : (
              <>
                Criar Empresa e Continuar
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Uma loja principal será criada automaticamente para você.
          <br />
          Você poderá adicionar mais lojas depois.
        </p>
      </Card>

      {/* Footer */}
      <p className="text-sm text-muted-foreground mt-8">
        © 2026 NAVANHULA CLOUD. Todos os direitos reservados.
      </p>
    </div>
  );
};

export default OnboardingPage;
