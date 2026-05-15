import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wallet, ArrowRightLeft, RefreshCw, Building2, Banknote,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { toast } from 'sonner';
import { isValidId } from '@/lib/uuid';

import WalletBalanceCards, { PAYMENT_LABELS } from '@/components/wallet/WalletBalanceCards';
import WalletTransactionList from '@/components/wallet/WalletTransactionList';
import PayoutDialog from '@/components/wallet/PayoutDialog';
import ScheduledPayments from '@/components/wallet/ScheduledPayments';

interface WalletData {
  id: string;
  store_id: string;
  payment_method: string;
  balance: number;
  updated_at: string;
}

interface StoreOption {
  id: string;
  name: string;
}

interface Payout {
  id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

const WalletPage: React.FC = () => {
  const { user, store, role } = useAuth();
  const isAdmin = role === 'admin' || role === 'manager' || (role as string) === 'ceo';

  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showPayout, setShowPayout] = useState(false);

  // Transfer state
  const [transferMethod, setTransferMethod] = useState('cash');
  const [transferToStore, setTransferToStore] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  const currentStoreId = selectedStore || store?.id || '';

  useEffect(() => {
    loadData();
  }, [currentStoreId]);

  const loadData = async () => {
    if (!isValidId(currentStoreId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [walletsRes, txRes, storesRes, payoutsRes] = await Promise.all([
        supabase.from('wallets').select('*').eq('store_id', currentStoreId),
        supabase.from('wallet_transactions').select('*').eq('store_id', currentStoreId).order('created_at', { ascending: false }).limit(50),
        supabase.from('stores').select('id, name'),
        supabase.from('payouts').select('*').eq('store_id', currentStoreId).order('created_at', { ascending: false }).limit(20),
      ]);

      if (walletsRes.data) setWallets(walletsRes.data);
      if (txRes.data) setTransactions(txRes.data as any);
      if (storesRes.data) setStores(storesRes.data);
      if (payoutsRes.data) setPayouts(payoutsRes.data as any);
    } catch (err) {
      console.error('Error loading wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

  const handleTransfer = async () => {
    if (!transferToStore || !transferAmount || !transferMethod) {
      toast.error('Preencha todos os campos');
      return;
    }
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valor inválido');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('transfer_between_stores', {
        p_from_store_id: currentStoreId,
        p_to_store_id: transferToStore,
        p_payment_method: transferMethod,
        p_amount: amount,
      });
      if (error) throw error;
      const result = data as any;
      if (result.success) {
        toast.success(result.message);
        setShowTransfer(false);
        setTransferAmount('');
        loadData();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Erro na transferência');
    }
  };

  const getPayoutStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'secondary' },
      completed: { label: 'Concluído', variant: 'default' },
      failed: { label: 'Falhou', variant: 'destructive' },
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
            <Wallet className="w-6 h-6 text-primary" />
            NAVA PAY
          </h1>
          <p className="text-sm text-muted-foreground">
            Carteira digital, pagamentos e levantamentos
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && stores.length > 1 && (
            <Select value={currentStoreId} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Selecionar loja" />
              </SelectTrigger>
              <SelectContent>
                {stores.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="icon" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          {isAdmin && (
            <Button variant="outline" onClick={() => setShowPayout(true)}>
              <Banknote className="w-4 h-4 mr-2" />
              Levantar
            </Button>
          )}
          {isAdmin && stores.length > 1 && (
            <Button onClick={() => setShowTransfer(true)}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transferir
            </Button>
          )}
        </div>
      </div>

      {/* Balance Cards */}
      <WalletBalanceCards wallets={wallets} />

      {/* Tabs */}
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Transações</TabsTrigger>
          <TabsTrigger value="payouts">Levantamentos</TabsTrigger>
          <TabsTrigger value="scheduled">Agendados</TabsTrigger>
        </TabsList>
        <TabsContent value="history">
          <WalletTransactionList transactions={transactions} />
        </TabsContent>
        <TabsContent value="payouts">
          <Card>
            {payouts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Banknote className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum levantamento solicitado</p>
              </div>
            ) : (
              <div className="divide-y">
                {payouts.map(p => (
                  <div key={p.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Levantamento via {p.payment_method.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(p.created_at)}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="font-bold">{formatCurrency(Number(p.amount))}</p>
                        {Number(p.fee_amount) > 0 && (
                          <p className="text-xs text-muted-foreground">Taxa: {formatCurrency(Number(p.fee_amount))}</p>
                        )}
                      </div>
                      {getPayoutStatusBadge(p.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="scheduled">
          {currentStoreId && user?.company_id ? (
            <ScheduledPayments storeId={currentStoreId} companyId={user.company_id} />
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <p>Selecione uma loja para ver agendamentos</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Transfer Modal */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              Transferência entre Lojas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">De:</label>
              <Card className="p-3 bg-secondary/50">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>{stores.find(s => s.id === currentStoreId)?.name || 'Loja atual'}</span>
                </div>
              </Card>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Para:</label>
              <Select value={transferToStore} onValueChange={setTransferToStore}>
                <SelectTrigger><SelectValue placeholder="Selecionar loja destino" /></SelectTrigger>
                <SelectContent>
                  {stores.filter(s => s.id !== currentStoreId).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Método:</label>
              <Select value={transferMethod} onValueChange={setTransferMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['cash', 'mpesa', 'emola', 'card'].map(m => (
                    <SelectItem key={m} value={m}>{PAYMENT_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Valor (MT):</label>
              <Input type="number" placeholder="0.00" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} className="text-lg h-12" />
            </div>
            <Button className="w-full h-12" onClick={handleTransfer}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Confirmar Transferência
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payout Modal */}
      <PayoutDialog
        open={showPayout}
        onOpenChange={setShowPayout}
        storeId={currentStoreId}
        totalBalance={totalBalance}
        onSuccess={loadData}
      />
    </div>
  );
};

export default WalletPage;
