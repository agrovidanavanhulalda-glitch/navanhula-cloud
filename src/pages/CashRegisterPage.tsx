import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePOS } from '@/contexts/POSContext';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DollarSign,
  Lock,
  Unlock,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CashMovement } from '@/types/pos';

const CashRegisterPage: React.FC = () => {
  const { store, user } = useAuth();
  const { cashRegister, openCashRegister, closeCashRegister, loadCashRegister } = usePOS();
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [todaySales, setTodaySales] = useState({ total: 0, count: 0, cash: 0 });

  useEffect(() => {
    loadCashRegister();
  }, [loadCashRegister]);

  useEffect(() => {
    const fetchMovements = async () => {
      if (!cashRegister) return;

      const { data } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('cash_register_id', cashRegister.id)
        .order('created_at', { ascending: false });

      setMovements(data as CashMovement[] || []);
    };

    const fetchTodaySales = async () => {
      if (!cashRegister) return;

      const { data } = await supabase
        .from('sales')
        .select('total, payment_method')
        .eq('cash_register_id', cashRegister.id)
        .eq('status', 'completed');

      const total = data?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
      const cash = data?.filter(s => s.payment_method === 'cash')
        .reduce((sum, sale) => sum + Number(sale.total), 0) || 0;

      setTodaySales({ total, count: data?.length || 0, cash });
    };

    fetchMovements();
    fetchTodaySales();
  }, [cashRegister]);

  const handleOpen = async () => {
    const amount = parseFloat(openingAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Insira um valor válido');
      return;
    }

    setLoading(true);
    try {
      await openCashRegister(amount);
      setOpenModal(false);
      setOpeningAmount('');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    const amount = parseFloat(closingAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Insira um valor válido');
      return;
    }

    setLoading(true);
    try {
      await closeCashRegister(amount, notes || undefined);
      setCloseModal(false);
      setClosingAmount('');
      setNotes('');
    } finally {
      setLoading(false);
    }
  };

  const expectedAmount = cashRegister 
    ? cashRegister.opening_amount + todaySales.cash 
    : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Caixa</h1>
          <p className="text-muted-foreground">Controle de abertura e fecho de caixa</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
            {new Date().toLocaleDateString('pt-MZ', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
      </div>

      {/* Status Card */}
      <div className={`pos-card p-6 ${cashRegister ? 'border-success/50' : 'border-warning/50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              cashRegister ? 'bg-success/20' : 'bg-warning/20'
            }`}>
              {cashRegister ? (
                <Unlock className="w-8 h-8 text-success" />
              ) : (
                <Lock className="w-8 h-8 text-warning" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                Caixa {cashRegister ? 'Aberto' : 'Fechado'}
              </h2>
              {cashRegister ? (
                <p className="text-muted-foreground">
                  Aberto às {formatDateTime(cashRegister.opened_at)}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Abra o caixa para iniciar as vendas
                </p>
              )}
            </div>
          </div>

          {cashRegister ? (
            <Button
              variant="destructive"
              onClick={() => setCloseModal(true)}
              className="pos-touch-button"
            >
              <Lock className="w-5 h-5 mr-2" />
              Fechar Caixa
            </Button>
          ) : (
            <Button
              className="pos-button-success pos-touch-button"
              onClick={() => setOpenModal(true)}
            >
              <Unlock className="w-5 h-5 mr-2" />
              Abrir Caixa
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {cashRegister && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="pos-card">
            <p className="pos-stat-label">Valor de Abertura</p>
            <p className="pos-stat-value pos-money">
              {formatCurrency(cashRegister.opening_amount)}
            </p>
          </div>
          <div className="pos-card">
            <p className="pos-stat-label">Vendas em Dinheiro</p>
            <p className="pos-stat-value pos-money text-success">
              +{formatCurrency(todaySales.cash)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {todaySales.count} vendas • Total: {formatCurrency(todaySales.total)}
            </p>
          </div>
          <div className="pos-card">
            <p className="pos-stat-label">Valor Esperado</p>
            <p className="pos-stat-value pos-money text-primary">
              {formatCurrency(expectedAmount)}
            </p>
          </div>
        </div>
      )}

      {/* Movements History */}
      {cashRegister && movements.length > 0 && (
        <div className="pos-card">
          <h3 className="font-semibold mb-4">Movimentações</h3>
          <div className="space-y-2">
            {movements.map((mov) => (
              <div key={mov.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                {mov.type === 'in' ? (
                  <ArrowUpCircle className="w-5 h-5 text-success" />
                ) : (
                  <ArrowDownCircle className="w-5 h-5 text-destructive" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{mov.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(mov.created_at)}
                  </p>
                </div>
                <span className={`font-semibold pos-money ${
                  mov.type === 'in' ? 'text-success' : 'text-destructive'
                }`}>
                  {mov.type === 'in' ? '+' : '-'}{formatCurrency(mov.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caixa</DialogTitle>
            <DialogDescription>
              Insira o valor inicial do caixa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor de Abertura (MZN)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                className="pos-input text-center text-2xl h-16 pos-money"
                autoFocus
              />
            </div>
            <Button
              className="w-full pos-button-success h-12"
              onClick={handleOpen}
              disabled={loading}
            >
              {loading ? 'Abrindo...' : 'Confirmar Abertura'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Modal */}
      <Dialog open={closeModal} onOpenChange={setCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar Caixa</DialogTitle>
            <DialogDescription>
              Confirme o valor final do caixa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex justify-between text-sm mb-2">
                <span>Valor de Abertura</span>
                <span className="pos-money">{formatCurrency(cashRegister?.opening_amount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Vendas em Dinheiro</span>
                <span className="pos-money text-success">+{formatCurrency(todaySales.cash)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-border pt-2 mt-2">
                <span>Valor Esperado</span>
                <span className="pos-money text-primary">{formatCurrency(expectedAmount)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Valor de Fecho (MZN)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                className="pos-input text-center text-2xl h-16 pos-money"
                autoFocus
              />
            </div>

            {closingAmount && (
              <div className={`p-3 rounded-lg ${
                parseFloat(closingAmount) === expectedAmount 
                  ? 'bg-success/20 text-success' 
                  : 'bg-warning/20 text-warning'
              }`}>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Diferença: {formatCurrency(parseFloat(closingAmount) - expectedAmount)}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Input
                placeholder="Notas sobre o fecho..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="pos-input"
              />
            </div>

            <Button
              className="w-full h-12"
              variant="destructive"
              onClick={handleClose}
              disabled={loading}
            >
              {loading ? 'Fechando...' : 'Confirmar Fecho'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashRegisterPage;
