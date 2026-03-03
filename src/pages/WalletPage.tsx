import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  RefreshCw,
  Banknote,
  Smartphone,
  CreditCard,
  Ticket,
  TrendingUp,
  Building2,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { toast } from 'sonner';

interface WalletData {
  id: string;
  store_id: string;
  payment_method: string;
  balance: number;
  updated_at: string;
}

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

interface StoreOption {
  id: string;
  name: string;
}

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="w-5 h-5" />,
  mpesa: <Smartphone className="w-5 h-5" />,
  emola: <Smartphone className="w-5 h-5" />,
  card: <CreditCard className="w-5 h-5" />,
  voucher: <Ticket className="w-5 h-5" />,
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  mpesa: 'M-Pesa',
  emola: 'E-Mola',
  card: 'Cartão',
  voucher: 'Voucher',
};

const PAYMENT_COLORS: Record<string, string> = {
  cash: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  mpesa: 'bg-red-500/10 text-red-700 border-red-200',
  emola: 'bg-orange-500/10 text-orange-700 border-orange-200',
  card: 'bg-blue-500/10 text-blue-700 border-blue-200',
  voucher: 'bg-purple-500/10 text-purple-700 border-purple-200',
};

const WalletPage: React.FC = () => {
  const { user, store, role } = useAuth();
  const isAdmin = role === 'admin' || role === 'manager' || (role as string) === 'ceo';

  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);

  // Transfer state
  const [transferMethod, setTransferMethod] = useState('cash');
  const [transferToStore, setTransferToStore] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  const currentStoreId = selectedStore || store?.id || '';

  useEffect(() => {
    loadData();
  }, [currentStoreId]);

  const loadData = async () => {
    if (!currentStoreId) return;
    setLoading(true);
    try {
      const [walletsRes, txRes, storesRes] = await Promise.all([
        supabase.from('wallets').select('*').eq('store_id', currentStoreId),
        supabase.from('wallet_transactions').select('*').eq('store_id', currentStoreId).order('created_at', { ascending: false }).limit(50),
        supabase.from('stores').select('id, name'),
      ]);

      if (walletsRes.data) setWallets(walletsRes.data);
      if (txRes.data) setTransactions(txRes.data as any);
      if (storesRes.data) setStores(storesRes.data);
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
    } catch (err: any) {
      toast.error('Erro na transferência');
    }
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      credit: 'Crédito',
      debit: 'Débito',
      transfer_in: 'Transferência Recebida',
      transfer_out: 'Transferência Enviada',
    };
    return map[type] || type;
  };

  const getTypeIcon = (type: string) => {
    if (type === 'credit') return <ArrowDownLeft className="w-4 h-4 text-emerald-600" />;
    if (type === 'debit') return <ArrowUpRight className="w-4 h-4 text-red-600" />;
    if (type === 'transfer_in') return <ArrowDownLeft className="w-4 h-4 text-blue-600" />;
    return <ArrowUpRight className="w-4 h-4 text-orange-600" />;
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" />
            Carteira Digital
          </h1>
          <p className="text-sm text-muted-foreground">
            Saldos e movimentações por método de pagamento
          </p>
        </div>
        <div className="flex gap-2">
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
          {isAdmin && stores.length > 1 && (
            <Button onClick={() => setShowTransfer(true)}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transferir
            </Button>
          )}
        </div>
      </div>

      {/* Total Balance */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Saldo Total</p>
            <p className="text-4xl font-bold text-primary">{formatCurrency(totalBalance)}</p>
          </div>
          <TrendingUp className="w-10 h-10 text-primary/40" />
        </div>
      </Card>

      {/* Wallet Cards by Method */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {['cash', 'mpesa', 'emola', 'card', 'voucher'].map(method => {
          const wallet = wallets.find(w => w.payment_method === method);
          const balance = wallet ? Number(wallet.balance) : 0;
          return (
            <Card key={method} className={`p-4 border ${PAYMENT_COLORS[method]}`}>
              <div className="flex items-center gap-2 mb-2">
                {PAYMENT_ICONS[method]}
                <span className="font-medium text-sm">{PAYMENT_LABELS[method]}</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(balance)}</p>
            </Card>
          );
        })}
      </div>

      {/* Transaction History */}
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="history">
          <Card>
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma transação registrada</p>
              </div>
            ) : (
              <div className="divide-y">
                {transactions.map(tx => (
                  <div key={tx.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(tx.type)}
                      <div>
                        <p className="font-medium text-sm">{getTypeLabel(tx.type)}</p>
                        <p className="text-xs text-muted-foreground">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${tx.type.includes('out') || tx.type === 'debit' ? 'text-destructive' : 'text-emerald-600'}`}>
                        {tx.type.includes('out') || tx.type === 'debit' ? '-' : '+'}{formatCurrency(Number(tx.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Saldo: {formatCurrency(Number(tx.balance_after))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
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
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar loja destino" />
                </SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['cash', 'mpesa', 'emola', 'card'].map(m => (
                    <SelectItem key={m} value={m}>{PAYMENT_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Valor (MT):</label>
              <Input
                type="number"
                placeholder="0.00"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="text-lg h-12"
              />
            </div>
            <Button className="w-full h-12" onClick={handleTransfer}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Confirmar Transferência
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletPage;
