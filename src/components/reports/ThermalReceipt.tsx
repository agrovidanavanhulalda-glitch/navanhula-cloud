import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Printer, X, FileDown } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { LocalSale } from '@/contexts/LocalPOSContext';
import { downloadPdfA4 } from '@/lib/generatePdfA4';

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
  storeName = 'NAVANHULA CLOUD',
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
            .no-print { display: none !important; }
            @media print {
              body { width: 100%; padding: 0; }
              @page { margin: 0; size: 80mm auto; }
              .no-print { display: none !important; }
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

  const getPaymentMethodName = (sale: LocalSale) => {
    if (sale.paymentMethod === 'split' && sale.paymentDetails?.splitDetails) {
      const { cashAmount, electronicAmount, electronicMethod } = sale.paymentDetails.splitDetails;
      const eMethod = electronicMethod === 'mpesa' ? 'M-Pesa' : electronicMethod === 'emola' ? 'E-Mola' : 'Cartão';
      return `Misto (D: ${formatCurrency(cashAmount)} + ${eMethod}: ${formatCurrency(electronicAmount)})`;
    }
    const methods: Record<string, string> = {
      cash: 'Dinheiro', card: 'Cartão', mpesa: 'M-Pesa', emola: 'E-Mola',
    };
    return methods[sale.paymentMethod || 'cash'] || 'Outro';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('pt-MZ', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const receiptNumber = `${new Date(sale.createdAt).getTime().toString(36).toUpperCase().slice(-6)}`;

  // Resolve seller name — never show UUID or generic fallback
  const resolvedSellerName = (() => {
    const name = sale.sellerName;
    if (!name || name === 'Vendedor' || name === 'Usuário') return undefined;
    // Check if it looks like a UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(name)) return undefined;
    return name;
  })();

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:bg-transparent print:backdrop-blur-none">
      <Card className="w-full max-w-sm bg-card border shadow-xl print:shadow-none print:border-none print:max-w-none">
        {/* Actions - hidden on print */}
        <div className="flex items-center justify-between p-4 border-b print:hidden">
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
            {storeNuit && <div className="text-xs font-semibold">NUIT: {storeNuit}</div>}
            {fiscalRegime && <div className="text-xs">Regime: {fiscalRegime.toUpperCase()}</div>}
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          <div className="text-xs space-y-1">
            <div>Data: {formatDate(sale.createdAt)}</div>
            <div>Recibo: #{receiptNumber}</div>
            <div>Pagamento: {getPaymentMethodName(sale)}</div>
            {sale.isOffline && <div className="font-bold text-red-600">*** MODO OFFLINE ***</div>}
            <div>Sincronizado: {sale.synced ? 'Sim' : 'Pendente'}</div>
            {resolvedSellerName && <div>Vendedor: {resolvedSellerName}</div>}
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Items table with proper alignment */}
          <div className="space-y-1">
            {sale.items.map((item, index) => (
              <div key={index} className="text-xs">
                <div className="flex justify-between">
                  <span className="flex-1 truncate max-w-[160px]">{item.product.name}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>{item.quantity}x {formatCurrency(item.product.salePrice)}</span>
                  <span className="font-medium">{formatCurrency(item.total)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          {(() => {
            const ivaRate = fiscalRegime === 'iva' ? 0.16 : 0;
            const subtotalSemIva = ivaRate > 0 ? sale.total / (1 + ivaRate) : sale.subtotal;
            const ivaAmount = ivaRate > 0 ? sale.total - subtotalSemIva : 0;
            return (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(ivaRate > 0 ? subtotalSemIva : sale.subtotal)}</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Desconto:</span>
                    <span>-{formatCurrency(sale.discount)}</span>
                  </div>
                )}
                {ivaRate > 0 && (
                  <div className="flex justify-between">
                    <span>IVA (16%):</span>
                    <span>{formatCurrency(ivaAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-300">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(sale.total)}</span>
                </div>
                {sale.amountReceived && sale.amountReceived > sale.total && (
                  <>
                    <div className="flex justify-between">
                      <span>Recebido:</span>
                      <span>{formatCurrency(sale.amountReceived)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Troco:</span>
                      <span>{formatCurrency(sale.changeGiven || 0)}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          <div className="border-t border-dashed border-gray-400 my-2" />

          <div className="text-center text-xs mt-3">
            <div className="font-semibold">Obrigado pela preferência!</div>
            <div className="mt-1 text-gray-500">Documento gerado pelo NAVANHULA CLOUD</div>
            {storeNuit && <div className="text-gray-400 mt-0.5">{storeName}</div>}
          </div>
        </div>

        {/* Action Buttons - hidden on print */}
        <div className="p-4 border-t space-y-2 print:hidden">
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
