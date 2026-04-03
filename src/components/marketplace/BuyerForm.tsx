import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório').max(100),
  tipo: z.string().default('mercado'),
  provincia: z.string().optional(),
  distrito: z.string().optional(),
  localizacao: z.string().optional(),
  capacidade_compra: z.coerce.number().min(0).default(0),
  frequencia_compra: z.string().default('mensal'),
  preferencia_tipo: z.string().default('corte'),
  peso_min: z.coerce.number().min(0).default(0),
  peso_max: z.coerce.number().min(0).default(0),
  preco_alvo: z.coerce.number().min(0).default(0),
  forma_pagamento: z.string().optional(),
  prazo_pagamento: z.string().optional(),
  telefone: z.string().optional(),
  telefone_alt: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess?: () => void;
  editData?: any;
}

const BuyerForm: React.FC<Props> = ({ onSuccess, editData }) => {
  const { company } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editData || { tipo: 'mercado', frequencia_compra: 'mensal', preferencia_tipo: 'corte' },
  });

  const onSubmit = async (data: FormData) => {
    if (!company?.id) return toast.error('Empresa não encontrada');
    setLoading(true);
    try {
      const payload = { ...data, company_id: company.id } as any;
      if (editData?.id) {
        const { error } = await supabase.from('compradores').update(payload).eq('id', editData.id);
        if (error) throw error;
        toast.success('Comprador atualizado!');
      } else {
        const { error } = await supabase.from('compradores').insert(payload);
        if (error) throw error;
        toast.success('Comprador cadastrado!');
      }
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, name, type = 'text', placeholder = '' }: { label: string; name: keyof FormData; type?: string; placeholder?: string }) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} placeholder={placeholder} {...register(name)} />
      {errors[name] && <p className="text-xs text-destructive">{errors[name]?.message as string}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Dados do Comprador</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome *" name="nome" placeholder="Nome do comprador" />
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select defaultValue={watch('tipo')} onValueChange={v => setValue('tipo', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mercado">Mercado</SelectItem>
                <SelectItem value="revendedor">Revendedor</SelectItem>
                <SelectItem value="hotel">Hotel/Restaurante</SelectItem>
                <SelectItem value="supermercado">Supermercado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label="Província" name="provincia" />
          <Field label="Distrito" name="distrito" />
          <Field label="Localização" name="localizacao" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Preferências de Compra</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Capacidade (aves/ciclo)" name="capacidade_compra" type="number" />
          <div className="space-y-1">
            <Label>Frequência</Label>
            <Select defaultValue={watch('frequencia_compra')} onValueChange={v => setValue('frequencia_compra', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="quinzenal">Quinzenal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tipo Preferido</Label>
            <Select defaultValue={watch('preferencia_tipo')} onValueChange={v => setValue('preferencia_tipo', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="corte">Corte</SelectItem>
                <SelectItem value="postura">Postura</SelectItem>
                <SelectItem value="misto">Misto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label="Peso Mínimo (kg)" name="peso_min" type="number" />
          <Field label="Peso Máximo (kg)" name="peso_max" type="number" />
          <Field label="Preço Alvo (MT)" name="preco_alvo" type="number" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pagamento & Contacto</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Forma de Pagamento" name="forma_pagamento" />
          <Field label="Prazo de Pagamento" name="prazo_pagamento" />
          <Field label="Telefone" name="telefone" />
          <Field label="Telefone Alt." name="telefone_alt" />
          <Field label="Email" name="email" type="email" />
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {editData ? 'Atualizar Comprador' : 'Salvar Comprador'}
      </Button>
    </form>
  );
};

export default BuyerForm;
