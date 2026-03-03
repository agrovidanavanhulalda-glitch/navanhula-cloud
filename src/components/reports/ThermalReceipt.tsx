import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Printer, X, FileDown } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { LocalSale } from '@/contexts/LocalPOSContext';
import { downloadPdfA4 } from '@/lib/generatePdfA4';

// RECIBO TÉRMICO + PDF A4

interface ThermalReceiptProps {
  sale: LocalSale;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeNuit?: string;
  fiscalRegime?: string;
  companyName?: string;
  onClose: () => void;
}

const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  sale,
  storeName = 'NAVANHULA POS',
  storeAddress = '',
  storePhone = '',
  storeNuit = '',
  fiscalRegime = '',
  companyName = '',
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
          <title>Recibo</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', 'Lucida Console', monospace; 
              font-size: 12px; line-height: 1.3; padding: 5px;
              width: 280px; margin: 0 auto;
            }
            .header { text-align: center; margin-bottom: 10px; }
            .store-name { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .item { display: flex; justify-content: space-between; margin: 4px 0; }
            .total-line { font-weight: bold; font-size: 14px; margin-top: 8px; }
            .footer { text-align: center; margin-top: 15px; font-size: 11px; }
            @media print {
              body { width: 100%; padding: 0; }
              @page { margin: 0; size: 80mm auto; }
            }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const handleDownloadPdf = () => {
    downloadPdfA4({
      sale,
      storeName,
      storeAddress,
      storePhone,
      storeNuit,
      fiscalRegime,
      companyName,
    });
  };

  const getPaymentMethodName = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Dinheiro', card: 'Cartão', mpesa: 'M-Pesa', emola: 'E-Mola',
    };
    return methods[method] || 'Outro';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('pt-MZ', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const receiptNumber = `${new Date(sale.createdAt).getTime().toString(36).toUpperCase().slice(-6)}`;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-card border shadow-xl">
        {/* Actions */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">Recibo de Venda</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Thermal Receipt Content */}
        <div ref={receiptRef} className="p-4 bg-white text-black font-mono text-sm leading-relaxed">
          <div className="text-center mb-3">
            <div className="text-lg font-bold tracking-wide">{storeName}</div>
            {storeAddress && <div className="text-xs">{storeAddress}</div>}
            {storePhone && <div className="text-xs">Tel: {storePhone}</div>}
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          <div className="text-xs space-y-1">
            <div>Data: {formatDate(sale.createdAt)}</div>
            <div>Recibo: #{receiptNumber}</div>
            <div>Pagamento: {getPaymentMethodName(sale.paymentMethod || 'cash')}</div>
            {sale.sellerName && <div>Vendedor: {sale.sellerName}</div>}
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          <div className="space-y-1">
            {sale.items.map((item, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="flex-1 truncate max-w-[140px]">{item.product.name}</span>
                <span className="w-8 text-center">{item.quantity}x</span>
                <span className="w-16 text-right">{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

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
            <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-300">
              <span>TOTAL:</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          <div className="text-center text-xs mt-3">
            <div className="font-semibold">Obrigado pela preferência!</div>
            <div className="mt-1 text-gray-500">{storeName}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t space-y-2">
          <Button onClick={handlePrint} className="w-full h-12 text-lg">
            <Printer className="w-5 h-5 mr-2" />
            Imprimir Térmico
          </Button>
          <Button onClick={handleDownloadPdf} variant="outline" className="w-full h-12 text-lg">
            <FileDown className="w-5 h-5 mr-2" />
            Baixar PDF A4
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ThermalReceipt;
