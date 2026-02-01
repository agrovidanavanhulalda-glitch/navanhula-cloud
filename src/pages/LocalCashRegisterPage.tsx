import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalPOS, LocalCashRegister } from '@/contexts/LocalPOSContext';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Wallet, 
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Play,
  Square
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

// HYBRID: Local POS data + SaaS Auth

const LocalCashRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentStore,
    currentCashRegister,
    cashRegisters,
    openCashRegister,
    closeCashRegister,
  } = useLocalPOS();
  const { user } = useAuth();

  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');

  // Get history for current store
  const storeHistory = cashRegisters
    .filter(cr => cr.storeId === currentStore.id)
    .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());

  // Handle open register
  const handleOpenRegister = () => {
    const amount = parseFloat(openingAmount) || 0;
    if (!user) {
      toast.error('Usuário não identificado');
      return;
    }
    openCashRegister(user.id, user.full_name, amount);
    toast.success('Caixa aberto com sucesso!');
    setShowOpenDialog(false);
    setOpeningAmount('');
    navigate('/pdv');
  };

  // Handle close register
  const handleCloseRegister = () => {
    const amount = parseFloat(closingAmount);
    if (isNaN(amount)) {
      toast.error('Informe o valor de fechamento');
      return;
    }
    closeCashRegister(amount);
    toast.success('Caixa fechado com sucesso!');
    setShowCloseDialog(false);
    setClosingAmount('');
  };

  // Format date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('pt-MZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate difference
  const calculateDifference = (register: LocalCashRegister) => {
    if (register.closingAmount === undefined || register.expectedAmount === undefined) return null;
    return register.closingAmount - register.expectedAmount;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            Caixa
          </h1>
          <p className="text-muted-foreground">{currentStore.name}</p>
        </div>
        
        {currentCashRegister ? (
          <Button variant="destructive" onClick={() => setShowCloseDialog(true)}>
            <Square className="w-4 h-4 mr-2" />
            Fechar Caixa
          </Button>
        ) : (
          <Button onClick={() => setShowOpenDialog(true)}>
            <Play className="w-4 h-4 mr-2" />
            Abrir Caixa
          </Button>
        )}
      </div>

      {/* Current Register Status */}
      {currentCashRegister ? (
        <Card className="p-6 mb-6 border-green-500/50 bg-green-50/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Caixa Aberto</h3>
                <p className="text-sm text-muted-foreground">
                  Operador: {currentCashRegister.sellerName}
                </p>
              </div>
            </div>
            <Badge variant="default" className="bg-green-500">Aberto</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg">
              <p className="text-sm text-muted-foreground">Abertura</p>
              <p className="text-xl font-bold">{formatCurrency(currentCashRegister.openingAmount)}</p>
            </div>
            <div className="p-4 bg-white rounded-lg">
              <p className="text-sm text-muted-foreground">Vendas</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(currentCashRegister.salesTotal)}</p>
            </div>
            <div className="p-4 bg-white rounded-lg">
              <p className="text-sm text-muted-foreground">Qtd. Vendas</p>
              <p className="text-xl font-bold">{currentCashRegister.salesCount}</p>
            </div>
            <div className="p-4 bg-white rounded-lg">
              <p className="text-sm text-muted-foreground">Esperado</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(currentCashRegister.openingAmount + currentCashRegister.salesTotal)}
              </p>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Aberto em: {formatDate(currentCashRegister.openedAt)}
          </div>
        </Card>
      ) : (
        <Card className="p-6 mb-6 border-destructive/50 bg-destructive/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Caixa Fechado</h3>
              <p className="text-sm text-muted-foreground">
                Abra o caixa para iniciar as vendas
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* History */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Histórico de Caixas
        </h3>

        {storeHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum registro de caixa</p>
          </div>
        ) : (
          <div className="space-y-3">
            {storeHistory.map((register) => {
              const difference = calculateDifference(register);
              return (
                <div 
                  key={register.id}
                  className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge variant={register.status === 'open' ? 'default' : 'secondary'}>
                        {register.status === 'open' ? 'Aberto' : 'Fechado'}
                      </Badge>
                      <span className="font-medium">{register.sellerName}</span>
                    </div>
                    {difference !== null && (
                      <Badge 
                        variant={difference >= 0 ? 'default' : 'destructive'}
                        className="gap-1"
                      >
                        {difference >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Abertura:</span>
                      <span className="ml-2 font-medium">{formatCurrency(register.openingAmount)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vendas:</span>
                      <span className="ml-2 font-medium text-green-600">{formatCurrency(register.salesTotal)}</span>
                    </div>
                    {register.closingAmount !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Fechamento:</span>
                        <span className="ml-2 font-medium">{formatCurrency(register.closingAmount)}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Qtd:</span>
                      <span className="ml-2 font-medium">{register.salesCount} vendas</span>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Aberto: {formatDate(register.openedAt)}
                    </span>
                    {register.closedAt && (
                      <span>Fechado: {formatDate(register.closedAt)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Open Register Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caixa</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openingAmount">Valor Inicial (Fundo de Caixa)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="openingAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Informe o valor em dinheiro disponível no caixa
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOpenRegister}>
              <Play className="w-4 h-4 mr-2" />
              Abrir Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Register Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar Caixa</DialogTitle>
          </DialogHeader>

          {currentCashRegister && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Valor Inicial:</span>
                  <span className="font-medium">{formatCurrency(currentCashRegister.openingAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total de Vendas:</span>
                  <span className="font-medium text-green-600">{formatCurrency(currentCashRegister.salesTotal)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Valor Esperado:</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(currentCashRegister.openingAmount + currentCashRegister.salesTotal)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="closingAmount">Valor em Caixa (Contagem)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="closingAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Conte o dinheiro no caixa e informe o valor total
                </p>
              </div>

              {closingAmount && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex justify-between items-center">
                    <span>Diferença:</span>
                    {(() => {
                      const diff = parseFloat(closingAmount) - (currentCashRegister.openingAmount + currentCashRegister.salesTotal);
                      return (
                        <span className={`font-bold ${diff >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleCloseRegister}>
              <Square className="w-4 h-4 mr-2" />
              Fechar Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocalCashRegisterPage;
