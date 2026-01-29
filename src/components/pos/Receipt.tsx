import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Printer, Download, X } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { LocalSale } from '@/contexts/LocalPOSContext';

interface ReceiptProps {
  sale: LocalSale;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  onClose: () => void;
}

const Receipt: React.FC<ReceiptProps> = ({
  sale,
  storeName = 'NAVANHULA POS',
  storeAddress = 'Loja Principal',
  storePhone = '',
  onClose,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo - ${sale.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px;
              padding: 10px;
              max-width: 300px;
              margin: 0 auto;
            }
            .header { text-align: center; margin-bottom: 15px; }
            .store-name { font-size: 16px; font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .item-name { flex: 1; }
            .item-qty { width: 30px; text-align: center; }
            .item-price { width: 70px; text-align: right; }
            .total { font-weight: bold; font-size: 14px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleDownloadPDF = () => {
    // Simple text-based receipt download
    const receiptText = generateReceiptText();
    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo-${sale.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateReceiptText = () => {
    const date = new Date(sale.createdAt).toLocaleString('pt-MZ');
    const lines = [
      '========================================',
      `           ${storeName}`,
      storeAddress ? `           ${storeAddress}` : '',
      storePhone ? `           Tel: ${storePhone}` : '',
      '========================================',
      '',
      `Data: ${date}`,
      `Recibo: ${sale.id.slice(0, 8).toUpperCase()}`,
      `Pagamento: ${getPaymentMethodName(sale.paymentMethod || 'cash')}`,
      '',
      '----------------------------------------',
      'ITEM                    QTD       VALOR',
      '----------------------------------------',
      ...sale.items.map(item => {
        const name = item.product.name.slice(0, 20).padEnd(20);
        const qty = String(item.quantity).padStart(3);
        const price = formatCurrency(item.total).padStart(10);
        return `${name} ${qty} ${price}`;
      }),
      '----------------------------------------',
      '',
      `Subtotal:              ${formatCurrency(sale.subtotal).padStart(15)}`,
      sale.discount > 0 ? `Desconto:              -${formatCurrency(sale.discount).padStart(14)}` : '',
      `TOTAL:                 ${formatCurrency(sale.total).padStart(15)}`,
      '',
      '========================================',
      '       Obrigado pela preferência!',
      '========================================',
      '',
      `          ${storeName}`,
    ].filter(Boolean);

    return lines.join('\n');
  };

  const getPaymentMethodName = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Dinheiro',
      card: 'Cartão',
      mpesa: 'M-Pesa',
      emola: 'E-Mola',
    };
    return methods[method] || method;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('pt-MZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border shadow-lg">
        {/* Actions */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Recibo de Venda</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} className="p-6 bg-white text-black font-mono text-sm">
          {/* Header */}
          <div className="header text-center mb-4">
            <div className="store-name text-lg font-bold">{storeName}</div>
            {storeAddress && <div className="text-xs">{storeAddress}</div>}
            {storePhone && <div className="text-xs">Tel: {storePhone}</div>}
          </div>

          <div className="divider border-t border-dashed border-gray-400 my-3" />

          {/* Info */}
          <div className="text-xs space-y-1">
            <div>Data: {formatDate(sale.createdAt)}</div>
            <div>Recibo: {sale.id.slice(0, 8).toUpperCase()}</div>
            <div>Pagamento: {getPaymentMethodName(sale.paymentMethod || 'cash')}</div>
          </div>

          <div className="divider border-t border-dashed border-gray-400 my-3" />

          {/* Items */}
          <div className="space-y-2">
            {sale.items.map((item, index) => (
              <div key={index} className="item flex justify-between text-xs">
                <span className="item-name flex-1 truncate">{item.product.name}</span>
                <span className="item-qty w-8 text-center">{item.quantity}x</span>
                <span className="item-price w-20 text-right">{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>

          <div className="divider border-t border-dashed border-gray-400 my-3" />

          {/* Totals */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Desconto:</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2">
              <span>TOTAL:</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
          </div>

          <div className="divider border-t border-dashed border-gray-400 my-3" />

          {/* Footer */}
          <div className="footer text-center text-xs mt-4">
            <div className="font-semibold">Obrigado pela preferência!</div>
            <div className="mt-2 text-gray-500">{storeName}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-4 border-t">
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Baixar
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Receipt;
