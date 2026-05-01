import React from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ArrowRight, Sparkles, ShoppingBag, Wallet, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const OnboardingChecklist: React.FC = () => {
  const { 
    first_product_added, 
    first_cash_opened, 
    first_sale_completed, 
    completionPct, 
    loading 
  } = useOnboarding();
  const navigate = useNavigate();

  if (loading || completionPct === 100) return null;

  const steps = [
    { 
      key: 'product', 
      label: 'Cadastrar primeiro produto', 
      description: 'Adicione o que você quer vender', 
      route: '/app/produtos', 
      done: first_product_added,
      icon: <ShoppingBag className="w-4 h-4" />
    },
    { 
      key: 'cash', 
      label: 'Começar o dia (Abrir Caixa)', 
      description: 'Informe quanto dinheiro tem no início', 
      route: '/app/caixa', 
      done: first_cash_opened,
      icon: <Wallet className="w-4 h-4" />
    },
    { 
      key: 'sale', 
      label: 'Fazer minha primeira venda', 
      description: 'Teste o sistema fazendo uma venda rápida', 
      route: '/app/pdv', 
      done: first_sale_completed,
      icon: <Receipt className="w-4 h-4" />
    },
  ];

  return (
    <Card className="p-5 border-primary/20 bg-primary/5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Vamos configurar sua empresa?</h3>
        </div>
        <span className="text-xs font-bold text-primary">{Math.round(completionPct)}%</span>
      </div>
      
      <Progress value={completionPct} className="h-2 mb-4" />
      
      <div className="space-y-3">
        {steps.map(step => (
          <div 
            key={step.key} 
            className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
              step.done 
              ? 'bg-success/5 border-success/10 opacity-70' 
              : 'bg-background border-border hover:border-primary/30'
            }`}
          >
            <div className={`mt-0.5 ${step.done ? 'text-success' : 'text-muted-foreground'}`}>
              {step.done ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${step.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-1">{step.description}</p>
            </div>

            {!step.done && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 px-2 text-xs gap-1 hover:bg-primary/10 hover:text-primary" 
                onClick={() => navigate(step.route)}
              >
                Ir <ArrowRight className="w-3 h-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default OnboardingChecklist;
