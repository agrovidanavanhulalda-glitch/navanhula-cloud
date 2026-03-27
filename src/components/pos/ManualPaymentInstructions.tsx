import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Copy, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { toast } from 'sonner';

interface ManualPaymentInstructionsProps {
  provider: 'mpesa' | 'emola';
  amount: number;
  storeId: string;
  companyId: string;
  saleId?: string;
  onPaymentCreated: (reference: string) => void;
  onCancel: () => void;
}

const PROVIDER_CONFIG: Record<string, { label: string; color: string; instructions: string[] }> = {
  mpesa: {
    label: 'M-Pesa',
    color: 'text-red-600',
    instructions: [
      'Abra o app M-Pesa no seu telefone',
      'Selecione "Transferir Dinheiro"',
      'Insira o número abaixo',
      'Insira o valor exato',
      'Adicione a referência no campo de descrição',
      'Confirme o pagamento',
    ],
  },
  emola: {
    label: 'e-Mola',
    color: 'text-orange-600',
    instructions: [
      'Abra o app e-Mola no seu telefone',
      'Selecione "Enviar Dinheiro"',
      'Insira o número abaixo',
      'Insira o valor exato',
      'Adicione a referência no campo de descrição',
      'Confirme o pagamento',
    ],
  },
};

const ManualPaymentInstructions: React.FC<ManualPaymentInstructionsProps> = ({
  provider,
  amount,
  storeId,
  companyId,
  saleId,
  onPaymentCreated,
  onCancel,
}) => {
  const { user } = useAuth();
  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');
  const [created, setCreated] = useState(false);
  const [loading, setLoading] = useState(false);

  const config = PROVIDER_CONFIG[provider];

  const handleCreatePayment = async () => {
    if (!phone.trim() || phone.length < 9) {
      toast.error('Insira um número de telefone válido');
      return;
    }

    setLoading(true);
    try {
      // Generate reference
      const { data: refData, error: refError } = await supabase.rpc('generate_nava_reference');
      if (refError) throw refError;
      const ref = refData as string;

      // Create manual payment
      const { error } = await supabase.from('manual_payments').insert({
        company_id: companyId,
        store_id: storeId,
        sale_id: saleId || null,
        amount,
        phone: phone.trim(),
        provider,
        reference: ref,
        status: 'pending',
      });

      if (error) throw error;

      setReference(ref);
      setCreated(true);
      onPaymentCreated(ref);
      toast.success('Pagamento registrado! Aguarde confirmação.');
    } catch (err) {
      console.error('Error creating manual payment:', err);
      toast.error('Erro ao criar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  if (created) {
    return (
      <div className="space-y-4">
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="text-center space-y-3">
            <Clock className="w-10 h-10 mx-auto text-primary" />
            <h3 className="font-bold text-lg">Pagamento Pendente</h3>
            <p className="text-sm text-muted-foreground">
              Siga as instruções abaixo para completar o pagamento via {config.label}
            </p>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Valor:</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(amount)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Referência:</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-sm">{reference}</Badge>
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(reference)}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Telefone:</span>
            <span className="font-medium">{phone}</span>
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Smartphone className={`w-4 h-4 ${config.color}`} />
            Instruções - {config.label}
          </h4>
          <ol className="space-y-2">
            {config.instructions.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="w-5 h-5 p-0 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  {i + 1}
                </Badge>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-3 bg-muted/50">
          <p className="text-xs text-muted-foreground text-center">
            ⏳ O operador irá confirmar o recebimento do pagamento. Pode demorar alguns minutos.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 text-center space-y-2">
        <Smartphone className={`w-10 h-10 mx-auto ${config.color}`} />
        <h3 className="font-bold">Pagamento via {config.label}</h3>
        <p className="text-3xl font-bold text-primary">{formatCurrency(amount)}</p>
      </Card>

      <div>
        <label className="text-sm font-medium mb-1 block">
          Número de telefone do cliente
        </label>
        <Input
          placeholder="84XXXXXXX"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="text-lg h-12"
          maxLength={13}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="flex-1" onClick={handleCreatePayment} disabled={loading || !phone.trim()}>
          <CheckCircle className="w-4 h-4 mr-2" />
          {loading ? 'Criando...' : 'Gerar Referência'}
        </Button>
      </div>
    </div>
  );
};

export default ManualPaymentInstructions;
