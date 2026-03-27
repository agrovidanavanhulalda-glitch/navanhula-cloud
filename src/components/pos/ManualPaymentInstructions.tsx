import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Copy, CheckCircle, Clock, Upload, Image } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
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
  provider, amount, storeId, companyId, saleId, onPaymentCreated, onCancel,
}) => {
  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = PROVIDER_CONFIG[provider];

  const handleCreatePayment = async () => {
    if (!phone.trim() || phone.length < 9) {
      toast.error('Insira um número de telefone válido');
      return;
    }

    setLoading(true);
    try {
      const { data: refData, error: refError } = await supabase.rpc('generate_nava_reference');
      if (refError) throw refError;
      const ref = refData as string;

      const { data: insertData, error } = await supabase.from('manual_payments').insert({
        company_id: companyId,
        store_id: storeId,
        sale_id: saleId || null,
        amount,
        phone: phone.trim(),
        provider,
        reference: ref,
        status: 'pending',
      }).select('id').single();

      if (error) throw error;

      setReference(ref);
      setPaymentId(insertData.id);
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

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !paymentId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 5MB)');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${paymentId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;

      await supabase.from('manual_payments')
        .update({ proof_image_url: publicUrl })
        .eq('id', paymentId);

      setProofUrl(publicUrl);
      toast.success('Comprovativo enviado!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar comprovativo');
    } finally {
      setUploading(false);
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

        {/* Proof Upload */}
        <Card className="p-4 space-y-3">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Upload className="w-4 h-4" />
            Enviar Comprovativo (opcional)
          </h4>
          <p className="text-xs text-muted-foreground">
            Envie um screenshot da confirmação do pagamento para acelerar a validação.
          </p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadProof} />
          {proofUrl ? (
            <div className="space-y-2">
              <img src={proofUrl} alt="Comprovativo" className="rounded-md border max-h-40 object-contain" />
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />Comprovativo enviado
              </p>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Image className="w-4 h-4 mr-1" />
              {uploading ? 'Enviando...' : 'Selecionar imagem'}
            </Button>
          )}
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
        <label className="text-sm font-medium mb-1 block">Número de telefone do cliente</label>
        <Input placeholder="84XXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} className="text-lg h-12" maxLength={13} />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button className="flex-1" onClick={handleCreatePayment} disabled={loading || !phone.trim()}>
          <CheckCircle className="w-4 h-4 mr-2" />
          {loading ? 'Criando...' : 'Gerar Referência'}
        </Button>
      </div>
    </div>
  );
};

export default ManualPaymentInstructions;
