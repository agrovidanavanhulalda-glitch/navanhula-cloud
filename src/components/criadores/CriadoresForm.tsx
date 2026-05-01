import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';

const provincias = [
  'Cabo Delgado', 'Gaza', 'Inhambane', 'Manica', 'Maputo Cidade',
  'Maputo Província', 'Nampula', 'Niassa', 'Sofala', 'Tete', 'Zambezia',
];

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  bi_nuit: z.string().optional(),
  telefone: z.string().min(1, 'Telefone obrigatório'),
  telefone_alt: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  provincia: z.string().optional(),
  distrito: z.string().optional(),
  localidade: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  capacidade: z.coerce.number().min(0).default(0),
  tipo_producao: z.string().default('corte'),
  experiencia_anos: z.coerce.number().min(0).default(0),
  fornecedor_pintos: z.string().optional(),
  fornecedor_racao: z.string().optional(),
  consumo_racao: z.string().optional(),
  plano_semanal: z.string().optional(),
  plano_quinzenal: z.string().optional(),
  plano_mensal: z.string().optional(),
  data_prevista_venda: z.string().optional(),
  peso_medio: z.coerce.number().min(0).default(0),
  precisa_tecnico: z.boolean().default(false),
  cria_sozinho: z.boolean().default(false),
  num_trabalhadores: z.coerce.number().min(0).default(0),
  tipo_instalacao: z.string().optional(),
  fonte_agua: z.string().optional(),
  fonte_energia: z.string().optional(),
  desafios: z.string().optional(),
  tem_mercado: z.boolean().default(false),
  mercados_atuais: z.string().optional(),
  preco_medio: z.coerce.number().min(0).default(0),
  forma_pagamento: z.string().optional(),
  confiabilidade: z.coerce.number().min(1).max(5).default(3),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  companyId: string;
  editingId: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

const CriadoresForm: React.FC<Props> = ({ companyId, editingId, onSaved, onCancel }) => {
  const { user } = useAuth();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '', bi_nuit: '', telefone: '', telefone_alt: '', email: '',
      provincia: '', distrito: '', localidade: '',
      capacidade: 0, tipo_producao: 'corte', experiencia_anos: 0,
      fornecedor_pintos: '', fornecedor_racao: '', consumo_racao: '',
      plano_semanal: '', plano_quinzenal: '', plano_mensal: '',
      data_prevista_venda: '', peso_medio: 0,
      precisa_tecnico: false, cria_sozinho: false, num_trabalhadores: 0,
      tipo_instalacao: '', fonte_agua: '', fonte_energia: '',
      desafios: '',
      tem_mercado: false, mercados_atuais: '', preco_medio: 0, forma_pagamento: '',
      confiabilidade: 3,
    },
  });

  useEffect(() => {
    if (editingId) {
      (async () => {
        const { data } = await supabase.from('criadores' as any).select('*').eq('id', editingId).single();
        if (data) {
          const d = data as any;
          form.reset({
            nome: d.nome || '', bi_nuit: d.bi_nuit || '', telefone: d.telefone || '',
            telefone_alt: d.telefone_alt || '', email: d.email || '',
            provincia: d.provincia || '', distrito: d.distrito || '', localidade: d.localidade || '',
            latitude: d.latitude, longitude: d.longitude,
            capacidade: d.capacidade || 0, tipo_producao: d.tipo_producao || 'corte',
            experiencia_anos: d.experiencia_anos || 0,
            fornecedor_pintos: d.fornecedor_pintos || '', fornecedor_racao: d.fornecedor_racao || '',
            consumo_racao: d.consumo_racao || '',
            plano_semanal: d.plano_semanal || '', plano_quinzenal: d.plano_quinzenal || '',
            plano_mensal: d.plano_mensal || '',
            data_prevista_venda: d.data_prevista_venda || '', peso_medio: d.peso_medio || 0,
            precisa_tecnico: d.precisa_tecnico || false, cria_sozinho: d.cria_sozinho || false,
            num_trabalhadores: d.num_trabalhadores || 0,
            tipo_instalacao: d.tipo_instalacao || '', fonte_agua: d.fonte_agua || '',
            fonte_energia: d.fonte_energia || '',
            desafios: d.desafios || '',
            tem_mercado: d.tem_mercado || false, mercados_atuais: d.mercados_atuais || '',
            preco_medio: d.preco_medio || 0, forma_pagamento: d.forma_pagamento || '',
            confiabilidade: d.confiabilidade || 3,
          });
        }
      })();
    }
  }, [editingId, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload: any = {
        ...values,
        company_id: companyId,
        data_prevista_venda: values.data_prevista_venda || null,
        email: values.email || null,
        created_by: user?.id,
      };

      if (editingId) {
        delete payload.created_by;
        const { error } = await supabase.from('criadores' as any).update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Criador atualizado com sucesso');
      } else {
        const { error } = await supabase.from('criadores' as any).insert(payload);
        if (error) throw error;
        toast.success('Criador cadastrado com sucesso');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar criador');
    }
  };

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-primary border-b border-border pb-2">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{editingId ? 'Editar Criador' : 'Cadastrar Novo Criador'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Section title="Dados Pessoais">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="bi_nuit" render={({ field }) => (
                <FormItem><FormLabel>BI / NUIT</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="telefone" render={({ field }) => (
                <FormItem><FormLabel>Telefone *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="telefone_alt" render={({ field }) => (
                <FormItem><FormLabel>Telefone Alternativo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </Section>

            <Section title="Localização">
              <FormField control={form.control} name="provincia" render={({ field }) => (
                <FormItem><FormLabel>Província</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>{provincias.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="distrito" render={({ field }) => (
                <FormItem><FormLabel>Distrito</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="localidade" render={({ field }) => (
                <FormItem><FormLabel>Localidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="latitude" render={({ field }) => (
                <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="longitude" render={({ field }) => (
                <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </Section>

            <Section title="Produção">
              <FormField control={form.control} name="capacidade" render={({ field }) => (
                <FormItem><FormLabel>Capacidade (aves)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="tipo_producao" render={({ field }) => (
                <FormItem><FormLabel>Tipo de Produção</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="corte">Corte</SelectItem>
                      <SelectItem value="postura">Postura</SelectItem>
                      <SelectItem value="misto">Misto</SelectItem>
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="experiencia_anos" render={({ field }) => (
                <FormItem><FormLabel>Experiência (anos)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </Section>

            <Section title="Fornecimento">
              <FormField control={form.control} name="fornecedor_pintos" render={({ field }) => (
                <FormItem><FormLabel>Fornecedor de Pintos</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="fornecedor_racao" render={({ field }) => (
                <FormItem><FormLabel>Fornecedor de Ração</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="consumo_racao" render={({ field }) => (
                <FormItem><FormLabel>Consumo de Ração</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </Section>

            <Section title="Planeamento">
              <FormField control={form.control} name="plano_semanal" render={({ field }) => (
                <FormItem><FormLabel>Plano Semanal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="plano_quinzenal" render={({ field }) => (
                <FormItem><FormLabel>Plano Quinzenal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="plano_mensal" render={({ field }) => (
                <FormItem><FormLabel>Plano Mensal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="data_prevista_venda" render={({ field }) => (
                <FormItem><FormLabel>Data Prevista de Venda</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="peso_medio" render={({ field }) => (
                <FormItem><FormLabel>Peso Médio (kg)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </Section>

            <Section title="Operação">
              <FormField control={form.control} name="precisa_tecnico" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormLabel>Precisa Técnico?</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="cria_sozinho" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormLabel>Cria Sozinho?</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="num_trabalhadores" render={({ field }) => (
                <FormItem><FormLabel>Nº Trabalhadores</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </Section>

            <Section title="Infraestrutura">
              <FormField control={form.control} name="tipo_instalacao" render={({ field }) => (
                <FormItem><FormLabel>Tipo de Instalação</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="fonte_agua" render={({ field }) => (
                <FormItem><FormLabel>Fonte de Água</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="fonte_energia" render={({ field }) => (
                <FormItem><FormLabel>Fonte de Energia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </Section>

            <Section title="Mercado">
              <FormField control={form.control} name="tem_mercado" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormLabel>Tem Mercado?</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="mercados_atuais" render={({ field }) => (
                <FormItem><FormLabel>Mercados Atuais</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="preco_medio" render={({ field }) => (
                <FormItem><FormLabel>Preço Médio (MT)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="forma_pagamento" render={({ field }) => (
                <FormItem><FormLabel>Forma de Pagamento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </Section>

            <Section title="Outros">
              <div className="col-span-full">
                <FormField control={form.control} name="desafios" render={({ field }) => (
                  <FormItem><FormLabel>Desafios</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="confiabilidade" render={({ field }) => (
                <FormItem><FormLabel>Confiabilidade (1-5)</FormLabel><FormControl><Input type="number" min={1} max={5} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </Section>

            <div className="flex gap-3 justify-end pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={onCancel} className="gap-2">
                <X className="h-4 w-4" />Cancelar
              </Button>
              <Button type="submit" className="gap-2">
                <Save className="h-4 w-4" />{editingId ? 'Atualizar' : 'Salvar Criador'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CriadoresForm;
