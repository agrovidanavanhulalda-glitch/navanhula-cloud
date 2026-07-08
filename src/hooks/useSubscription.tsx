import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isValidId } from '@/lib/uuid';

export type SubscriptionStatus = 'active' | 'warning' | 'blocked' | 'cancelled' | 'loading';

export interface Subscription {
  id: string;
  store_id: string;
  status: SubscriptionStatus;
  plan_tier: 'starter' | 'pro' | 'enterprise';
  price_monthly: number;
  current_period_start: string;
  current_period_end: string;
  grace_period_days: number;
  max_products: number;
  max_sellers: number;
  max_stores: number;
  blocked_at: string | null;
  notes: string | null;
  trial_ends_at: string | null;
}

export interface PaymentTransaction {
  id: string;
  subscription_id: string;
  amount: number;
  payment_method: 'mpesa' | 'emola' | 'manual';
  reference_id: string | null;
  phone_number: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export function useSubscription() {
  const { store, company, isAuthenticated, isFounder, isMaster } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SubscriptionStatus>('loading');

  const fetchSubscription = useCallback(async () => {
    // FOUNDER / MASTER bypass — unlimited lifetime access
    if (isFounder || isMaster || (company as any)?.billing_exempt) {
      setStatus('active');
      setLoading(false);
      return;
    }
    if (!isValidId(store?.id) || !isAuthenticated) {
      setLoading(false);
      if (!isAuthenticated) setStatus('active'); 
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('store_id', store.id)
        .maybeSingle();

      if (error) {
        console.warn('[Subscription] Error:', error.message);
        setStatus('active'); // Fallback
      } else if (data) {
        const sub = data as unknown as Subscription;
        setSubscription(sub);
        
        // Calculate real status based on dates
        const now = new Date();
        const periodEnd = new Date(sub.current_period_end);
        const graceEnd = new Date(periodEnd);
        graceEnd.setDate(graceEnd.getDate() + sub.grace_period_days);

        if (sub.status === 'cancelled') {
          setStatus('cancelled');
        } else if (now <= periodEnd) {
          setStatus('active');
        } else if (now <= graceEnd) {
          setStatus('warning');
        } else {
          setStatus('blocked');
        }
      } else {
        setStatus('active'); // No subscription = free/trial
      }
    } catch (err) {
      console.error('[Subscription] Fetch error:', err);
      setStatus('active');
    } finally {
      setLoading(false);
    }
  }, [store?.id, isAuthenticated, isFounder, isMaster, company]);

  const fetchPayments = useCallback(async () => {
    if (!isValidId(subscription?.id)) return;

    const { data } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('subscription_id', subscription.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setPayments(data as unknown as PaymentTransaction[]);
    }
  }, [subscription?.id]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Derived helpers
  const isBlocked = status === 'blocked';
  const isWarning = status === 'warning';
  const canSell = status === 'active' || status === 'warning';
  
  const daysRemaining = subscription 
    ? Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 30;

  return {
    subscription,
    payments,
    loading,
    status,
    isBlocked,
    isWarning,
    canSell,
    daysRemaining,
    refresh: fetchSubscription,
  };
}
