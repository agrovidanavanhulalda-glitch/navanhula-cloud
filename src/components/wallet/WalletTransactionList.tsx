import React from 'react';
import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/formatters';

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  fee_amount?: number;
  net_amount?: number;
  balance_after: number;
  provider?: string;
  description: string;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  credit: 'Crédito',
  debit: 'Débito',
  transfer_in: 'Transferência Recebida',
  transfer_out: 'Transferência Enviada',
  payout: 'Levantamento',
};

interface Props {
  transactions: WalletTransaction[];
}

const WalletTransactionList: React.FC<Props> = ({ transactions }) => {
  const getTypeIcon = (type: string) => {
    if (type === 'credit' || type === 'transfer_in')
      return <ArrowDownLeft className={`w-4 h-4 ${type === 'credit' ? 'text-emerald-600' : 'text-blue-600'}`} />;
    return <ArrowUpRight className={`w-4 h-4 ${type === 'debit' ? 'text-red-600' : 'text-orange-600'}`} />;
  };

  const isDebit = (type: string) => type.includes('out') || type === 'debit' || type === 'payout';

  if (transactions.length === 0) {
    return (
      <Card>
        <div className="p-8 text-center text-muted-foreground">
          <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma transação registrada</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="divide-y">
        {transactions.map(tx => (
          <div key={tx.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getTypeIcon(tx.type)}
              <div>
                <p className="font-medium text-sm">{TYPE_LABELS[tx.type] || tx.type}</p>
                <p className="text-xs text-muted-foreground">{tx.description}</p>
                {tx.provider && (
                  <p className="text-xs text-muted-foreground capitalize">via {tx.provider}</p>
                )}
                <p className="text-xs text-muted-foreground">{formatDateTime(tx.created_at)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-bold ${isDebit(tx.type) ? 'text-destructive' : 'text-emerald-600'}`}>
                {isDebit(tx.type) ? '-' : '+'}{formatCurrency(Number(tx.amount))}
              </p>
              {Number(tx.fee_amount || 0) > 0 && (
                <p className="text-xs text-orange-500">Taxa: {formatCurrency(Number(tx.fee_amount))}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Saldo: {formatCurrency(Number(tx.balance_after))}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default WalletTransactionList;
