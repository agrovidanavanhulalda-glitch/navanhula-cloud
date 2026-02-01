import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart, Building2, Loader2, ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const OnboardingPage: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [companyNif, setCompanyNif] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { completeOnboarding, onboardingCompleted, isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already completed onboarding
  useEffect(() => {
    if (!loading && isAuthenticated && onboardingCompleted) {
      navigate('/', { replace: true });
    }
  }, [loading, isAuthenticated, onboardingCompleted, navigate]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyName.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      await completeOnboarding({
        companyName: companyName.trim(),
        companyNif: companyNif.trim() || undefined,
        companyPhone: companyPhone.trim() || undefined,
        companyAddress: companyAddress.trim() || undefined,
      });
      
      // Navigate to dashboard after successful onboarding
      navigate('/', { replace: true });
    } catch (error) {
      // Error already handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h1 className="text-3xl font-bold text-primary">NAVANHULA POS</h1>
        <p className="text-muted-foreground mt-2">Sistema de Ponto de Venda</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Nome da Empresa *</Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Ex: Loja do João"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              autoFocus
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
        © 2024 NAVANHULA POS. Todos os direitos reservados.
      </p>
    </div>
  );
};

export default OnboardingPage;
