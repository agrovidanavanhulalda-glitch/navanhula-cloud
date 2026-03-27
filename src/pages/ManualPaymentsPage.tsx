import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Smartphone, CheckCircle, XCircle, RefreshCw, Clock, Search, AlertTriangle,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { toast } from 'sonner';

interface ManualPayment {
  id: string;
  company_id: string;
  store_id: string | null;
  sale_id: string | null;
  amount: number;
  phone: string;
  provider: string;
  reference: string;
  status: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  mpesa: 'M-Pesa',
  emola: 'e-Mola',
  mkesh: 'mKesh',
};

const ManualPaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<ManualPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; paymentId: string }>({ open: false, paymentId: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, [filter]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('manual_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter === 'pending') {
        query = query.eq('status', 'pending');
      }

      const { data, error } = await query;
      if (error) throw error;
      setPayments((data || []) as ManualPayment[]);
    } catch (err) {
      console.error('Error loading payments:', err);
      toast.error('Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (paymentId: string) => {
    if (!user?.id) return;
    setProcessing(paymentId);
    try {
      const { data, error } = await supabase.rpc('confirm_manual_payment', {
        p_payment_id: paymentId,
        p_confirmed_by: user.id,
      });
      if (error) throw error;
      const result = data as any;
      if (result.success) {
        toast.success(result.message);
        loadPayments();
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Erro ao confirmar pagamento');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!user?.id || !rejectDialog.paymentId) return;
    setProcessing(rejectDialog.paymentId);
    try {
      const { data, error } = await supabase.rpc('reject_manual_payment', {
        p_payment_id: rejectDialog.paymentId,
        p_rejected_by: user.id,
        p_reason: rejectReason || 'Pagamento não confirmado',
      });
      if (error) throw error;
      const result = data as any;
      if (result.success) {
        toast.success(result.message);
        setRejectDialog({ open: false, paymentId: '' });
        setRejectReason('');
        loadPayments();
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Erro ao rejeitar pagamento');
    } finally {
      setProcessing(null);
    }
  };

  const filteredPayments = payments.filter(p =>
    p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone.includes(searchTerm)
  );

  const pendingCount = payments.filter(p => p.status === 'pending').length;

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'secondary' },
      confirmed: { label: 'Confirmado', variant: 'default' },
      rejected: { label: 'Rejeitado', variant: 'destructive' },
    };
    const info = map[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-primary" />
            Pagamentos Mobile Money
          </h1>
          <p className="text-sm text-muted-foreground">
            Confirme ou rejeite pagamentos manuais
          </p>
        </div>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </Badge>
          )}
          <Button variant="outline" size="icon" onClick={loadPayments}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            <Clock className="w-3 h-3 mr-1" />
            Pendentes
          </Button>
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Todos
          </Button>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por referência ou telefone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Payments List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filteredPayments.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
          <p className="text-muted-foreground">
            {filter === 'pending' ? 'Nenhum pagamento pendente' : 'Nenhum pagamento encontrado'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map(payment => (
            <Card key={payment.id} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{formatCurrency(payment.amount)}</span>
                    {getStatusBadge(payment.status)}
                    <Badge variant="outline">{PROVIDER_LABELS[payment.provider] || payment.provider}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>📱 {payment.phone}</span>
                    <span>🔗 {payment.reference}</span>
                    <span>🕐 {formatDateTime(payment.created_at)}</span>
                  </div>
                  {payment.rejection_reason && (
                    <p className="text-sm text-destructive">Motivo: {payment.rejection_reason}</p>
                  )}
                </div>

                {payment.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(payment.id)}
                      disabled={processing === payment.id}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectDialog({ open: true, paymentId: payment.id })}
                      disabled={processing === payment.id}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={open => !open && setRejectDialog({ open: false, paymentId: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Informe o motivo da rejeição. A venda associada será cancelada.
            </p>
            <Textarea
              placeholder="Motivo da rejeição (opcional)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, paymentId: '' })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!!processing}>
              <XCircle className="w-4 h-4 mr-1" />
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManualPaymentsPage;
