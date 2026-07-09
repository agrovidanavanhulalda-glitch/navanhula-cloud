import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Flag } from 'lucide-react';

interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
}

export const FounderFeatureFlagsPage: React.FC = () => {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['founder', 'feature_flags'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('feature_flags')
        .select('id, key, enabled, description')
        .order('key');
      if (error) throw error;
      return (data ?? []) as FeatureFlag[];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await (supabase as any)
        .from('feature_flags')
        .update({ enabled, updated_by: (await supabase.auth.getUser()).data.user?.id })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, enabled }) => {
      await qc.cancelQueries({ queryKey: ['founder', 'feature_flags'] });
      const prev = qc.getQueryData<FeatureFlag[]>(['founder', 'feature_flags']);
      qc.setQueryData<FeatureFlag[]>(['founder', 'feature_flags'], (old) =>
        (old ?? []).map((f) => (f.id === id ? { ...f, enabled } : f)),
      );
      return { prev };
    },
    onError: (err: any, _v, ctx) => {
      qc.setQueryData(['founder', 'feature_flags'], ctx?.prev);
      toast.error('Erro ao atualizar: ' + err.message);
    },
    onSuccess: () => toast.success('Feature flag atualizada'),
  });

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Flag className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-bold">Feature Flags</h2>
        <span className="text-xs text-muted-foreground">Controlo global de módulos</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {(data ?? []).map((f) => (
          <Card key={f.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-mono text-sm font-bold uppercase">{f.key}</p>
              {f.description && (
                <p className="text-xs text-muted-foreground truncate">{f.description}</p>
              )}
            </div>
            <Switch
              checked={f.enabled}
              disabled={toggle.isPending}
              onCheckedChange={(enabled) => toggle.mutate({ id: f.id, enabled })}
            />
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FounderFeatureFlagsPage;
