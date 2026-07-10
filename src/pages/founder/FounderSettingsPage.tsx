import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Save } from 'lucide-react';
import { toast } from 'sonner';

interface FormState {
  name: string;
  default_language: string;
  timezone: string;
  currency: string;
  vat_rate: number;
  trial_days: number;
  logo_url: string;
}

const DEFAULTS: FormState = {
  name: 'NAVANHULA CLOUD',
  default_language: 'pt',
  timezone: 'Africa/Maputo',
  currency: 'MZN',
  vat_rate: 16,
  trial_days: 7,
  logo_url: '',
};

export const FounderSettingsPage: React.FC = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(DEFAULTS);

  const query = useQuery({
    queryKey: ['founder', 'settings'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('founder_platform_settings_get');
      if (error) throw error;
      return (data as any)?.[0] ?? null;
    },
  });

  useEffect(() => {
    if (query.data) {
      setForm({
        name: query.data.name ?? DEFAULTS.name,
        default_language: query.data.default_language ?? DEFAULTS.default_language,
        timezone: query.data.timezone ?? DEFAULTS.timezone,
        currency: query.data.currency ?? DEFAULTS.currency,
        vat_rate: Number(query.data.vat_rate ?? DEFAULTS.vat_rate),
        trial_days: Number(query.data.trial_days ?? DEFAULTS.trial_days),
        logo_url: query.data.logo_url ?? '',
      });
    }
  }, [query.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('founder_platform_settings_upsert', { _payload: form as any });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Configurações salvas'); qc.invalidateQueries({ queryKey: ['founder', 'settings'] }); },
    onError: (e: any) => toast.error(e.message ?? 'Falhou'),
  });

  if (query.isLoading) return <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <Card className="border-gold/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Settings className="w-4 h-4" /> Configurações Globais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome da plataforma">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="URL do logo">
            <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Idioma default">
            <Input value={form.default_language} onChange={(e) => setForm({ ...form, default_language: e.target.value })} />
          </Field>
          <Field label="Timezone">
            <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          </Field>
          <Field label="Moeda (ISO)">
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="IVA (%)">
            <Input type="number" step="0.01" value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: Number(e.target.value) })} />
          </Field>
          <Field label="Duração do trial (dias)">
            <Input type="number" value={form.trial_days} onChange={(e) => setForm({ ...form, trial_days: Number(e.target.value) })} />
          </Field>
        </section>

        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-gradient-to-r from-gold to-accent text-accent-foreground">
            <Save className="w-4 h-4 mr-2" /> {save.isPending ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground border-t pt-4">
          Integrações sensíveis (SMTP, WhatsApp, SMS, Stripe, M-Pesa, E-Mola) devem ser configuradas via <strong>Secrets</strong> da plataforma para não expor credenciais.
        </p>
      </CardContent>
    </Card>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
    {children}
  </div>
);

export default FounderSettingsPage;
