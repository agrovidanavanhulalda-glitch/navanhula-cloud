import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Banknote, 
  CreditCard, 
  Smartphone, 
  Calculator,
  Check,
  ArrowRight,
  Split
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

export interface PaymentDetails {
  method: 'cash' | 'mpesa' | 'emola' | 'card' | 'split';
  amountReceived: number;
  change: number;
  // Split payment details
  splitDetails?: {
    cashAmount: number;
    electronicAmount: number;
    electronicMethod: 'mpesa' | 'emola' | 'card';
  };
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (paymentDetails: PaymentDetails) => void;
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  total,
  onConfirm,
}) => {
  const [paymentType, setPaymentType] = useState<'single' | 'split'>('single');
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'mpesa' | 'emola' | 'card'>('cash');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [change, setChange] = useState<number>(0);

  // Split payment state
  const [cashAmount, setCashAmount] = useState<string>('');
  const [electronicAmount, setElectronicAmount] = useState<string>('');
  const [electronicMethod, setElectronicMethod] = useState<'mpesa' | 'emola' | 'card'>('mpesa');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentType('single');
      setSelectedMethod('cash');
      setAmountReceived('');
      setChange(0);
      setCashAmount('');
      setElectronicAmount('');
      setElectronicMethod('mpesa');
    }
  }, [isOpen]);

  // Calculate change for single payment
  useEffect(() => {
    if (selectedMethod === 'cash' && paymentType === 'single') {
      const received = parseFloat(amountReceived) || 0;
      setChange(Math.max(0, received - total));
    } else {
      setChange(0);
    }
  }, [amountReceived, total, selectedMethod, paymentType]);

  // Calculate remaining for split payment
  const cashValue = parseFloat(cashAmount) || 0;
  const electronicValue = parseFloat(electronicAmount) || 0;
  const splitTotal = cashValue + electronicValue;
  const splitRemaining = total - splitTotal;
  const splitChange = cashValue > 0 ? Math.max(0, splitTotal - total) : 0;

  const handleQuickAmount = (amount: number) => {
    setAmountReceived(amount.toString());
  };

  const handleConfirmSingle = () => {
    if (selectedMethod === 'cash') {
      const received = parseFloat(amountReceived) || 0;
      if (received < total) {
        return; // Insufficient
      }
      onConfirm({
        method: 'cash',
        amountReceived: received,
        change: received - total,
      });
    } else {
      // Electronic payment - exact amount
      onConfirm({
        method: selectedMethod,
        amountReceived: total,
        change: 0,
      });
    }
  };

  const handleConfirmSplit = () => {
    if (splitTotal < total) {
      return; // Insufficient
    }
    onConfirm({
      method: 'split',
      amountReceived: splitTotal,
      change: splitChange,
      splitDetails: {
        cashAmount: cashValue,
        electronicAmount: electronicValue,
        electronicMethod,
      },
    });
  };

  const canConfirmSingle = 
    selectedMethod !== 'cash' || 
    (parseFloat(amountReceived) || 0) >= total;

  const canConfirmSplit = splitTotal >= total;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calculator className="w-5 h-5" />
            Finalizar Pagamento
          </DialogTitle>
        </DialogHeader>

        {/* Total Display */}
        <div className="bg-primary/10 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">Total a Pagar</p>
          <p className="text-4xl font-bold text-primary">{formatCurrency(total)}</p>
        </div>

        {/* Payment Type Tabs */}
        <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as 'single' | 'split')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              Pagamento Único
            </TabsTrigger>
            <TabsTrigger value="split" className="flex items-center gap-2">
              <Split className="w-4 h-4" />
              Dividir Pagamento
            </TabsTrigger>
          </TabsList>

          {/* Single Payment */}
          <TabsContent value="single" className="space-y-4">
            {/* Payment Method Selection */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant={selectedMethod === 'cash' ? 'default' : 'outline'}
                className="flex flex-col h-16"
                onClick={() => setSelectedMethod('cash')}
              >
                <Banknote className="w-5 h-5 mb-1" />
                <span className="text-xs">Dinheiro</span>
              </Button>
              <Button
                variant={selectedMethod === 'mpesa' ? 'default' : 'outline'}
                className="flex flex-col h-16"
                onClick={() => setSelectedMethod('mpesa')}
              >
                <Smartphone className="w-5 h-5 mb-1" />
                <span className="text-xs">M-Pesa</span>
              </Button>
              <Button
                variant={selectedMethod === 'emola' ? 'default' : 'outline'}
                className="flex flex-col h-16"
                onClick={() => setSelectedMethod('emola')}
              >
                <Smartphone className="w-5 h-5 mb-1" />
                <span className="text-xs">E-Mola</span>
              </Button>
              <Button
                variant={selectedMethod === 'card' ? 'default' : 'outline'}
                className="flex flex-col h-16"
                onClick={() => setSelectedMethod('card')}
              >
                <CreditCard className="w-5 h-5 mb-1" />
                <span className="text-xs">Cartão</span>
              </Button>
            </div>

            {/* Cash Amount Input */}
            {selectedMethod === 'cash' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Valor Entregue pelo Cliente
                  </label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="text-2xl h-14 text-center font-bold"
                    autoFocus
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_AMOUNTS.map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAmount(amount)}
                      className="h-10"
                    >
                      {formatCurrency(amount)}
                    </Button>
                  ))}
                </div>

                {/* Exact Amount Button */}
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => handleQuickAmount(total)}
                >
                  Valor Exato ({formatCurrency(total)})
                </Button>

                {/* Change Display */}
                {change > 0 && (
                  <Card className="p-4 bg-primary/10 border-primary/30">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-primary">
                        Troco a Devolver:
                      </span>
                      <span className="text-3xl font-bold text-primary">
                        {formatCurrency(change)}
                      </span>
                    </div>
                  </Card>
                )}

                {/* Insufficient warning */}
                {amountReceived && (parseFloat(amountReceived) || 0) < total && (
                  <Card className="p-3 bg-destructive/10 border-destructive/30">
                    <p className="text-sm text-destructive text-center">
                      Falta: {formatCurrency(total - (parseFloat(amountReceived) || 0))}
                    </p>
                  </Card>
                )}
              </div>
            )}

            {/* Electronic Payment Info */}
            {selectedMethod !== 'cash' && (
              <Card className="p-4 bg-secondary/50">
                <div className="text-center space-y-2">
                  <Smartphone className="w-10 h-10 mx-auto text-primary" />
                  <p className="font-medium">
                    Pagamento via {selectedMethod === 'mpesa' ? 'M-Pesa' : selectedMethod === 'emola' ? 'E-Mola' : 'Cartão'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Confirme o recebimento de {formatCurrency(total)}
                  </p>
                </div>
              </Card>
            )}

            {/* Confirm Button */}
            <Button
              className="w-full h-14 text-lg"
              disabled={!canConfirmSingle}
              onClick={handleConfirmSingle}
            >
              <Check className="w-5 h-5 mr-2" />
              Confirmar Pagamento
            </Button>
          </TabsContent>

          {/* Split Payment */}
          <TabsContent value="split" className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Divida o pagamento entre dinheiro e pagamento eletrônico
            </p>

            {/* Cash Part */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4" />
                <label className="text-sm font-medium">Parte em Dinheiro</label>
              </div>
              <Input
                type="number"
                placeholder="0.00"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="text-lg h-12"
              />
            </div>

            {/* Electronic Part */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                <label className="text-sm font-medium">Parte Eletrônica</label>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={electronicAmount}
                  onChange={(e) => setElectronicAmount(e.target.value)}
                  className="text-lg h-12 flex-1"
                />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={electronicMethod === 'mpesa' ? 'default' : 'outline'}
                    onClick={() => setElectronicMethod('mpesa')}
                    className="h-12"
                  >
                    M-Pesa
                  </Button>
                  <Button
                    size="sm"
                    variant={electronicMethod === 'emola' ? 'default' : 'outline'}
                    onClick={() => setElectronicMethod('emola')}
                    className="h-12"
                  >
                    E-Mola
                  </Button>
                  <Button
                    size="sm"
                    variant={electronicMethod === 'card' ? 'default' : 'outline'}
                    onClick={() => setElectronicMethod('card')}
                    className="h-12"
                  >
                    Cartão
                  </Button>
                </div>
              </div>
            </div>

            {/* Auto-fill remaining button */}
            {splitRemaining > 0 && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  if (!cashAmount) {
                    setCashAmount(total.toString());
                  } else {
                    setElectronicAmount(splitRemaining.toString());
                  }
                }}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Preencher Restante ({formatCurrency(splitRemaining)})
              </Button>
            )}

            <Card className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Dinheiro:</span>
                <span className="font-medium">{formatCurrency(cashValue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{electronicMethod === 'mpesa' ? 'M-Pesa' : electronicMethod === 'emola' ? 'E-Mola' : 'Cartão'}:</span>
                <span className="font-medium">{formatCurrency(electronicValue)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total Pago:</span>
                <span className={splitTotal >= total ? 'text-primary' : 'text-destructive'}>
                  {formatCurrency(splitTotal)}
                </span>
              </div>
              {splitRemaining > 0 && (
                <Badge variant="destructive" className="w-full justify-center">
                  Falta: {formatCurrency(splitRemaining)}
                </Badge>
              )}
              {splitChange > 0 && (
                <div className="flex justify-between text-primary font-bold">
                  <span>Troco:</span>
                  <span>{formatCurrency(splitChange)}</span>
                </div>
              )}
            </Card>

            {/* Confirm Button */}
            <Button
              className="w-full h-14 text-lg"
              disabled={!canConfirmSplit}
              onClick={handleConfirmSplit}
            >
              <Check className="w-5 h-5 mr-2" />
              Confirmar Pagamento Dividido
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
