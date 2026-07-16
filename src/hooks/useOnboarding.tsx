import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface OnboardingState {
  first_product_added: boolean;
  first_cash_opened: boolean;
  first_sale_completed: boolean;
}

export const useOnboarding = () => {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    first_product_added: false,
    first_cash_opened: false,
    first_sale_completed: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = async () => {
    if (!user?.id) return;
    setError(null);

    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('first_product_added, first_cash_opened, first_sale_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setState({
          first_product_added: !!data.first_product_added,
          first_cash_opened: !!data.first_cash_opened,
          first_sale_completed: !!data.first_sale_completed,
        });
      } else {
        // Create initial progress if it doesn't exist
        const { error: insertError } = await supabase
          .from('onboarding_progress')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
      }
    } catch (err: any) {
      console.error('Error fetching onboarding progress:', err);
      setError(err?.message || 'Não foi possível carregar o progresso.');
    } finally {
      setLoading(false);
    }
  };

  const updateStep = async (step: keyof OnboardingState, value: boolean = true) => {
    if (!user?.id) return;

    try {
      // Optimistic update
      setState(prev => ({ ...prev, [step]: value }));

      const { error } = await supabase
        .from('onboarding_progress')
        .update({ [step]: value })
        .eq('user_id', user.id);

      if (error) throw error;
      
      if (value) {
        const stepLabels: Record<keyof OnboardingState, string> = {
          first_product_added: 'Primeiro produto criado!',
          first_cash_opened: 'Caixa aberto com sucesso!',
          first_sale_completed: 'Primeira venda realizada!',
        };
        toast.success(stepLabels[step]);
      }
    } catch (error) {
      console.error(`Error updating onboarding step ${step}:`, error);
      // Revert on error
      fetchProgress();
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchProgress();
    }
  }, [user?.id]);

  const completionPct = [
    state.first_product_added,
    state.first_cash_opened,
    state.first_sale_completed,
  ].filter(Boolean).length / 3 * 100;

  return {
    ...state,
    loading,
    error,
    completionPct,
    updateStep,
    refresh: fetchProgress,
    retry: fetchProgress,
  };
};
