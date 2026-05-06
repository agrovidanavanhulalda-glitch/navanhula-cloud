import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalPOS, LocalCashRegister, LocalSeller } from '@/contexts/LocalPOSContext';
import { useAuth } from '@/contexts/AuthContext';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Wallet, 
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Play,
  Square,
  User
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { useOnboarding } from '@/hooks/useOnboarding';

// HYBRID: Local POS data + Alto Contraste para uso em loja

const LocalCashRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentStore,
    currentCashRegister,
    cashRegisters,
    sellers,
    openCashRegister,
    closeCashRegister,
  } = useLocalPOS();
  const { role } = useAuth();
  const { updateStep } = useOnboarding();
  const isAdmin = role === 'admin' || role === 'manager' || role === 'ceo' || role === 'director';

  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState('');

  // Get active sellers for current store
  const activeSellers = sellers.filter(s => s.isActive && s.storeId === currentStore.id);

  // Get history for current store
  const storeHistory = cashRegisters
    .filter(cr => cr.storeId === currentStore.id)
    .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())
    .slice(0, 10); // Últimos 10 registros

  const handleOpenRegister = async () => {
    const amount = parseFloat(openingAmount) || 0;
    const seller = sellers.find(s => s.id === selectedSellerId);
    
    if (!selectedSellerId || !seller) {
      toast.error('Selecione um vendedor');
      return;
    }
    
    try {
      await openCashRegister(seller.id, seller.name, amount);
      updateStep('first_cash_opened');
      setShowOpenDialog(false);
      setOpeningAmount('');
      setSelectedSellerId('');
      navigate('/pdv');
    } catch (error) {
      console.error('[CashRegisterPage] Erro ao abrir caixa:', error);
      toast.error('Falha ao abrir caixa');
    }
  };

  const handleCloseRegister = async () => {
    const amount = parseFloat(closingAmount);
    if (isNaN(amount)) {
      toast.error('Informe o valor de fechamento');
      return;
    }
    
    try {
      await closeCashRegister(amount);
      setShowCloseDialog(false);
      setClosingAmount('');
    } catch (error) {
      console.error('[CashRegisterPage] Erro ao fechar caixa:', error);
      toast.error('Falha ao fechar caixa');
    }
  };

  // Format date - human readable
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
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Wallet className="w-8 h-8" />
            Caixa
          </h1>
          <p className="text-lg text-muted-foreground mt-1">{currentStore.name}</p>
        </div>
        
        {currentCashRegister ? (
          <Button 
            variant="destructive" 
            size="lg"
            className="text-lg px-8 py-6"
            onClick={() => setShowCloseDialog(true)}
          >
            <Square className="w-5 h-5 mr-2" />
            Fechar Caixa
          </Button>
        ) : (
          <Button 
            size="lg"
            className="text-lg px-8 py-6 bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => setShowOpenDialog(true)}
          >
            <Play className="w-5 h-5 mr-2" />
            Abrir Caixa
          </Button>
        )}
      </div>

      {/* Current Register Status - ALTO CONTRASTE */}
      {currentCashRegister ? (
        <Card className="p-8 mb-8 border-2 border-success bg-success/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <div>
                <h3 className="font-bold text-2xl text-success">CAIXA ABERTO</h3>
                <p className="text-lg text-muted-foreground">
                  Operador: <span className="font-semibold text-foreground">{currentCashRegister.sellerName}</span>
                </p>
              </div>
            </div>
            <Badge className="bg-success text-success-foreground text-lg px-4 py-2">
              ABERTO
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card className="p-6 bg-card border-2">
              <p className="text-muted-foreground text-sm mb-1">Abertura</p>
              <p className="text-3xl font-bold">{formatCurrency(currentCashRegister.openingAmount)}</p>
            </Card>
            <Card className="p-6 bg-card border-2 border-success/50">
              <p className="text-muted-foreground text-sm mb-1">Vendas do Dia</p>
              <p className="text-3xl font-bold text-success">{formatCurrency(currentCashRegister.salesTotal)}</p>
            </Card>
            <Card className="p-6 bg-card border-2">
              <p className="text-muted-foreground text-sm mb-1">Qtd. Vendas</p>
              <p className="text-3xl font-bold">{currentCashRegister.salesCount}</p>
            </Card>
            <Card className="p-6 bg-card border-2 border-primary/50">
              <p className="text-muted-foreground text-sm mb-1">Total em Caixa</p>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(currentCashRegister.openingAmount + currentCashRegister.salesTotal)}
              </p>
            </Card>
          </div>

          <div className="mt-6 text-muted-foreground flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span className="text-lg">Aberto em: {formatDate(currentCashRegister.openedAt)}</span>
          </div>
        </Card>
      ) : (
        <Card className="p-8 mb-8 border-2 border-destructive bg-destructive/10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h3 className="font-bold text-2xl text-destructive">CAIXA FECHADO</h3>
              <p className="text-lg text-muted-foreground">
                Abra o caixa para iniciar as vendas
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* History */}
      <Card className="p-6">
        <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Histórico de Caixas
        </h3>

        {storeHistory.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Wallet className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Nenhum registro de caixa</p>
          </div>
        ) : (
          <div className="space-y-4">
            {storeHistory.map((register) => {
              const difference = calculateDifference(register);
              return (
                <Card 
                  key={register.id}
                  className="p-5 bg-muted/20 hover:bg-muted/40 transition-colors border"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant={register.status === 'open' ? 'default' : 'secondary'}
                        className={register.status === 'open' ? 'bg-success text-success-foreground text-lg' : 'text-lg'}
                      >
                        {register.status === 'open' ? 'Aberto' : 'Fechado'}
                      </Badge>
                      <span className="font-semibold text-lg">{register.sellerName}</span>
                    </div>
                    {difference !== null && (
                      <Badge 
                        variant={difference >= 0 ? 'default' : 'destructive'}
                        className="gap-1 text-lg px-3"
                      >
                        {difference >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                        {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-base">
                    <div>
                      <span className="text-muted-foreground">Abertura:</span>
                      <span className="ml-2 font-semibold">{formatCurrency(register.openingAmount)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vendas:</span>
                      <span className="ml-2 font-semibold text-success">{formatCurrency(register.salesTotal)}</span>
                    </div>
                    {register.closingAmount !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Fechamento:</span>
                        <span className="ml-2 font-semibold">{formatCurrency(register.closingAmount)}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Qtd:</span>
                      <span className="ml-2 font-semibold">{register.salesCount} vendas</span>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-muted-foreground flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Aberto: {formatDate(register.openedAt)}
                    </span>
                    {register.closedAt && (
                      <span>Fechado: {formatDate(register.closedAt)}</span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* Open Register Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Abrir Caixa</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="seller" className="text-base">Vendedor *</Label>
              <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {activeSellers.map(seller => (
                    <SelectItem key={seller.id} value={seller.id} className="text-base py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {seller.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeSellers.length === 0 && (
                <p className="text-sm text-destructive">
                  Cadastre vendedores primeiro
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="openingAmount" className="text-base">Valor Inicial (Fundo de Caixa)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  id="openingAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Informe o valor em dinheiro disponível no caixa
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" size="lg" onClick={() => setShowOpenDialog(false)}>
              Cancelar
            </Button>
            <Button 
              size="lg" 
              onClick={handleOpenRegister}
              disabled={!selectedSellerId}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              <Play className="w-5 h-5 mr-2" />
              Abrir Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Register Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Fechar Caixa</DialogTitle>
          </DialogHeader>

          {currentCashRegister && (
            <div className="space-y-5">
              <Card className="p-5 bg-muted/50 space-y-3">
                <div className="flex justify-between text-base">
                  <span>Valor Inicial:</span>
                  <span className="font-semibold">{formatCurrency(currentCashRegister.openingAmount)}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span>Total de Vendas:</span>
                  <span className="font-semibold text-success">{formatCurrency(currentCashRegister.salesTotal)}</span>
                </div>
                <div className="flex justify-between border-t pt-3 text-lg">
                  <span className="font-bold">Valor Esperado:</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(currentCashRegister.openingAmount + currentCashRegister.salesTotal)}
                  </span>
                </div>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="closingAmount" className="text-base">Valor em Caixa (Contagem)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="closingAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-10 h-12 text-lg"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Conte o dinheiro no caixa e informe o valor total
                </p>
              </div>

              {closingAmount && (
                <Card className="p-4 bg-muted/50">
                  <div className="flex justify-between items-center text-lg">
                    <span>Diferença:</span>
                    {(() => {
                      const diff = parseFloat(closingAmount) - (currentCashRegister.openingAmount + currentCashRegister.salesTotal);
                      return (
                        <span className={`font-bold text-xl ${diff >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                        </span>
                      );
                    })()}
                  </div>
                </Card>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" size="lg" onClick={() => setShowCloseDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" size="lg" onClick={handleCloseRegister}>
              <Square className="w-5 h-5 mr-2" />
              Fechar Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocalCashRegisterPage;
