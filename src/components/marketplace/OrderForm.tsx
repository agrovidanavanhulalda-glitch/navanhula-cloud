import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  comprador_id: z.string().uuid('Selecione um comprador'),
  quantidade: z.coerce.number().min(1, 'Mínimo 1'),
  tipo_producao: z.string().default('corte'),
  peso_desejado: z.coerce.number().min(0).default(0),
  preco_oferecido: z.coerce.number().min(0).default(0),
  data_entrega: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess?: () => void;
}

const OrderForm: React.FC<Props> = ({ onSuccess }) => {
  const { company } = useAuth();
  const [loading, setLoading] = useState(false);
  const [buyers, setBuyers] = useState<any[]>([]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo_producao: 'corte' },
  });

  useEffect(() => {
    if (!company?.id) return;
    supabase.from('compradores').select('id, nome').eq('company_id', company.id).eq('status', 'ativo')
      .then(({ data }) => setBuyers(data || []));
  }, [company?.id]);

  const onSubmit = async (data: FormData) => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('pedidos_marketplace').insert({
        ...data,
        company_id: company.id,
        status: 'aberto',
      } as any);
      if (error) throw error;
      toast.success('Pedido criado!');
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Novo Pedido</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1 md:col-span-2">
            <Label>Comprador *</Label>
            <Select onValueChange={v => setValue('comprador_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {buyers.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.comprador_id && <p className="text-xs text-destructive">{errors.comprador_id.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Quantidade *</Label>
            <Input type="number" {...register('quantidade')} />
            {errors.quantidade && <p className="text-xs text-destructive">{errors.quantidade.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Tipo Produção</Label>
            <Select defaultValue="corte" onValueChange={v => setValue('tipo_producao', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="corte">Corte</SelectItem>
                <SelectItem value="postura">Postura</SelectItem>
                <SelectItem value="misto">Misto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Peso Desejado (kg)</Label>
            <Input type="number" step="0.1" {...register('peso_desejado')} />
          </div>
          <div className="space-y-1">
            <Label>Preço Oferecido (MT)</Label>
            <Input type="number" step="0.01" {...register('preco_oferecido')} />
          </div>
          <div className="space-y-1">
            <Label>Data de Entrega</Label>
            <Input type="date" {...register('data_entrega')} />
          </div>
        </CardContent>
      </Card>
      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Criar Pedido
      </Button>
    </form>
  );
};

export default OrderForm;
