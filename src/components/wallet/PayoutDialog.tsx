import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Banknote, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  totalBalance: number;
  onSuccess: () => void;
}

const PayoutDialog: React.FC<Props> = ({ open, onOpenChange, storeId, totalBalance, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('mpesa');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [feeRate, setFeeRate] = useState(1);

  useEffect(() => {
    if (open) {
      supabase
        .from('platform_fees')
        .select('fee_percentage')
        .eq('fee_type', 'payout')
        .eq('is_active', true)
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data) setFeeRate(Number(data.fee_percentage));
        });
    }
  }, [open]);

  const parsedAmount = parseFloat(amount) || 0;
  const feeAmount = Math.round(parsedAmount * feeRate) / 100;
  const netAmount = parsedAmount - feeAmount;

  const handleSubmit = async () => {
    if (parsedAmount <= 0) {
      toast.error('Valor inválido');
      return;
    }
    if (parsedAmount > totalBalance) {
      toast.error('Saldo insuficiente');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('request_payout', {
        p_store_id: storeId,
        p_amount: parsedAmount,
        p_payment_method: method,
        p_phone_number: phone || null,
      });

      if (error) throw error;
      const result = data as any;
      if (result.success) {
        toast.success(`Levantamento solicitado: ${formatCurrency(result.net)}`);
        onOpenChange(false);
        setAmount('');
        setPhone('');
        onSuccess();
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      toast.error('Erro ao solicitar levantamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5" />
            Solicitar Levantamento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Card className="p-3 bg-secondary/50">
            <p className="text-sm text-muted-foreground">Saldo disponível</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalBalance)}</p>
          </Card>

          <div>
            <label className="text-sm font-medium mb-1 block">Método de levantamento:</label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="emola">E-Mola</SelectItem>
                <SelectItem value="bank">Transferência Bancária</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {method !== 'bank' && (
            <div>
              <label className="text-sm font-medium mb-1 block">Número de telefone:</label>
              <Input placeholder="84XXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1 block">Valor (MT):</label>
            <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="text-lg h-12" />
          </div>

          {parsedAmount > 0 && (
            <Card className="p-3 bg-muted/50 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Valor solicitado</span>
                <span>{formatCurrency(parsedAmount)}</span>
              </div>
              <div className="flex justify-between text-sm text-orange-600">
                <span>Taxa ({feeRate}%)</span>
                <span>-{formatCurrency(feeAmount)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1">
                <span>Valor a receber</span>
                <span className="text-primary">{formatCurrency(netAmount)}</span>
              </div>
            </Card>
          )}

          <Button className="w-full h-12" onClick={handleSubmit} disabled={loading || parsedAmount <= 0}>
            <ArrowUpRight className="w-4 h-4 mr-2" />
            {loading ? 'Processando...' : 'Confirmar Levantamento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayoutDialog;
