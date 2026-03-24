import React from 'react';
import { Card } from '@/components/ui/card';
import { Banknote, Smartphone, CreditCard, Ticket, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface WalletData {
  id: string;
  store_id: string;
  payment_method: string;
  balance: number;
  updated_at: string;
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

export { PAYMENT_LABELS };

interface Props {
  wallets: WalletData[];
}

const WalletBalanceCards: React.FC<Props> = ({ wallets }) => {
  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

  return (
    <>
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Saldo Total</p>
            <p className="text-4xl font-bold text-primary">{formatCurrency(totalBalance)}</p>
          </div>
          <TrendingUp className="w-10 h-10 text-primary/40" />
        </div>
      </Card>

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
    </>
  );
};

export default WalletBalanceCards;
