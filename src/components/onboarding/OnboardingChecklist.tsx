import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OnboardingStep {
  key: string;
  label: string;
  description: string;
  route: string;
  done: boolean;
}

const OnboardingChecklist: React.FC = () => {
  const { user, company } = useAuth();
  const navigate = useNavigate();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const p = data as any;
      const s: OnboardingStep[] = [
        { key: 'company_created', label: 'Criar empresa', description: 'Configure sua empresa', route: '/app/configuracoes', done: p?.company_created || !!company?.id },
        { key: 'first_product_added', label: 'Adicionar produto', description: 'Cadastre seu primeiro produto', route: '/app/produtos', done: p?.first_product_added || false },
        { key: 'first_sale_completed', label: 'Primeira venda', description: 'Realize sua primeira venda no PDV', route: '/app/pdv', done: p?.first_sale_completed || false },
        { key: 'first_customer_added', label: 'Cadastrar cliente', description: 'Adicione seu primeiro cliente', route: '/app/crm', done: p?.first_customer_added || false },
      ];
      setSteps(s);
      const completed = s.filter(st => st.done).length;
      setProgress(Math.round((completed / s.length) * 100));

      // Auto-create progress row if missing
      if (!p && user.id) {
        await supabase.from('onboarding_progress').insert({
          user_id: user.id,
          company_created: !!company?.id,
        });
      }
    };
    load();
  }, [user?.id, company?.id]);

  if (dismissed || progress === 100) return null;

  return (
    <Card className="p-5 border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Primeiros Passos</h3>
        </div>
        <button onClick={() => setDismissed(true)} className="text-xs text-muted-foreground hover:text-foreground">Fechar</button>
      </div>
      <Progress value={progress} className="h-2 mb-4" />
      <p className="text-xs text-muted-foreground mb-3">{progress}% concluído</p>
      <div className="space-y-2">
        {steps.map(step => (
          <div key={step.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-background/60 transition-colors">
            {step.done
              ? <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))] flex-shrink-0" />
              : <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            {!step.done && (
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => navigate(step.route)}>
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
