import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import {
  ArrowLeft, CreditCard, Smartphone, Banknote, Package, CheckCircle2, Copy
} from 'lucide-react';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
}

interface ECommerceCheckoutProps {
  cart: CartItem[];
  total: number;
  storeName: string;
  companyName: string;
  onBack: () => void;
  onComplete: () => void;
}

type PaymentMethod = 'mpesa' | 'emola' | 'cash' | 'card' | 'transfer';

const paymentMethods = [
  { id: 'mpesa' as PaymentMethod, label: 'M-Pesa', icon: <Smartphone className="w-5 h-5" />, color: 'text-red-500' },
  { id: 'emola' as PaymentMethod, label: 'e-Mola', icon: <Smartphone className="w-5 h-5" />, color: 'text-blue-500' },
  { id: 'card' as PaymentMethod, label: 'Cartão', icon: <CreditCard className="w-5 h-5" />, color: 'text-purple-500' },
  { id: 'transfer' as PaymentMethod, label: 'Transferência', icon: <Banknote className="w-5 h-5" />, color: 'text-green-500' },
];

const ECommerceCheckout: React.FC<ECommerceCheckoutProps> = ({
  cart, total, storeName, companyName, onBack, onComplete
}) => {
  const [step, setStep] = useState<'info' | 'payment' | 'confirm'>('info');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  const handleSubmitInfo = () => {
    if (!customerName.trim()) {
      toast.error('Informe o seu nome');
      return;
    }
    if (!customerPhone.trim()) {
      toast.error('Informe o seu telefone');
      return;
    }
    setStep('payment');
  };

  const handleConfirmOrder = () => {
    if (!selectedPayment) {
      toast.error('Selecione um método de pagamento');
      return;
    }
    setStep('confirm');
  };

  const handleFinalConfirm = () => {
    setOrderConfirmed(true);
    setTimeout(() => onComplete(), 3000);
  };

  const orderId = `PED-${Date.now().toString(36).toUpperCase()}`;

  if (orderConfirmed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md w-full">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Pedido Confirmado!</h2>
          <p className="text-muted-foreground mb-4">
            O seu pedido <strong>{orderId}</strong> foi recebido com sucesso.
          </p>
          <p className="text-sm text-muted-foreground">
            Entraremos em contacto pelo número {customerPhone} para confirmar a entrega.
          </p>
          <div className="mt-6 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Total: {formatCurrency(total)}</p>
            <p className="text-xs text-muted-foreground">
              Pagamento via {paymentMethods.find(p => p.id === selectedPayment)?.label}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar ao catálogo
      </Button>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6">
        {['Dados', 'Pagamento', 'Confirmação'].map((s, i) => {
          const stepKeys = ['info', 'payment', 'confirm'];
          const currentIdx = stepKeys.indexOf(step);
          const isActive = i === currentIdx;
          const isDone = i < currentIdx;
          return (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${isActive ? 'bg-primary text-primary-foreground' : isDone ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs border border-current">
                  {isDone ? '✓' : i + 1}
                </span>
                {s}
              </div>
              {i < 2 && <div className={`flex-1 h-px ${i < currentIdx ? 'bg-primary' : 'bg-border'}`} />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Form */}
        <div className="md:col-span-2">
          {step === 'info' && (
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Dados do Cliente</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nome completo *</label>
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Seu nome" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Telefone *</label>
                  <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+258 84 xxx xxxx" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email (opcional)</label>
                  <Input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="email@exemplo.com" type="email" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Endereço de entrega</label>
                  <Input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Bairro, rua, referência..." />
                </div>
              </div>
              <Button className="w-full" onClick={handleSubmitInfo}>
                Continuar para Pagamento
              </Button>
            </Card>
          )}

          {step === 'payment' && (
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Método de Pagamento</h2>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map(pm => (
                  <Card
                    key={pm.id}
                    className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedPayment === pm.id ? 'ring-2 ring-primary border-primary' : 'border-border/50'
                    }`}
                    onClick={() => setSelectedPayment(pm.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={pm.color}>{pm.icon}</span>
                      <span className="font-medium text-sm">{pm.label}</span>
                    </div>
                  </Card>
                ))}
              </div>

              {selectedPayment && (selectedPayment === 'mpesa' || selectedPayment === 'emola') && (
                <div className="p-4 bg-muted rounded-lg text-sm space-y-1">
                  <p className="font-medium">Instruções de pagamento:</p>
                  <p>1. Envie {formatCurrency(total)} para o número da loja</p>
                  <p>2. Guarde o comprovativo</p>
                  <p>3. O pedido será confirmado após verificação</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('info')} className="flex-1">
                  Voltar
                </Button>
                <Button className="flex-1" onClick={handleConfirmOrder} disabled={!selectedPayment}>
                  Revisar Pedido
                </Button>
              </div>
            </Card>
          )}

          {step === 'confirm' && (
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Confirmar Pedido</h2>
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                  <p><strong>Cliente:</strong> {customerName}</p>
                  <p><strong>Telefone:</strong> {customerPhone}</p>
                  {customerEmail && <p><strong>Email:</strong> {customerEmail}</p>}
                  {deliveryAddress && <p><strong>Entrega:</strong> {deliveryAddress}</p>}
                  <p><strong>Pagamento:</strong> {paymentMethods.find(p => p.id === selectedPayment)?.label}</p>
                </div>

                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b border-border/30">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between text-lg font-bold pt-2">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('payment')} className="flex-1">
                  Voltar
                </Button>
                <Button className="flex-1 h-12" onClick={handleFinalConfirm}>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Confirmar Pedido
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Order summary sidebar */}
        <div>
          <Card className="p-4 sticky top-4">
            <h3 className="font-semibold mb-3">Resumo do Pedido</h3>
            <div className="space-y-2 mb-4">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Package className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.quantity}x {formatCurrency(item.price)}</p>
                  </div>
                  <p className="font-medium text-xs">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-sm mb-1">
                <span>Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1 text-muted-foreground">
                <span>Entrega</span>
                <span>A combinar</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 text-center">
              {companyName} — {storeName}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ECommerceCheckout;
