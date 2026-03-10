import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bluetooth, BluetoothConnected, Printer, Loader2 } from 'lucide-react';
import { bluetoothPrinter, ReceiptData } from '@/services/BluetoothPrinterService';
import { LocalSale } from '@/contexts/LocalPOSContext';
import { toast } from 'sonner';

interface BluetoothPrintButtonProps {
  sale?: LocalSale | null;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeNuit?: string;
}

const BluetoothPrintButton: React.FC<BluetoothPrintButtonProps> = ({
  sale,
  storeName,
  storeAddress,
  storePhone,
  storeNuit,
}) => {
  const [connecting, setConnecting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    if (!bluetoothPrinter.isAvailable()) {
      toast.error('Bluetooth não disponível. Use Chrome ou Edge, ou instale o app nativo.');
      return;
    }

    setConnecting(true);
    try {
      const device = await bluetoothPrinter.connect();
      setConnected(true);
      toast.success(`Conectado a: ${device.name}`);
    } catch (error: any) {
      toast.error(error.message || 'Falha ao conectar à impressora');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    bluetoothPrinter.disconnect();
    setConnected(false);
    toast.info('Impressora desconectada');
  };

  const handlePrint = async () => {
    if (!sale) {
      toast.error('Nenhuma venda para imprimir');
      return;
    }

    if (!bluetoothPrinter.isConnected()) {
      toast.error('Impressora não conectada');
      setConnected(false);
      return;
    }

    setPrinting(true);
    try {
      const receiptNumber = new Date(sale.createdAt)
        .getTime()
        .toString(36)
        .toUpperCase()
        .slice(-6);

      const receiptData: ReceiptData = {
        storeName,
        storeAddress,
        storePhone,
        storeNuit,
        receiptNumber,
        date: new Date(sale.createdAt).toLocaleString('pt-MZ', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        items: sale.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.salePrice,
          total: item.total,
        })),
        subtotal: sale.subtotal,
        discount: sale.discount,
        total: sale.total,
        paymentMethod: sale.paymentMethod || 'cash',
        amountReceived: sale.amountReceived,
        change: sale.changeGiven,
        sellerName: sale.sellerName,
      };

      await bluetoothPrinter.printReceipt(receiptData);
      toast.success('Recibo impresso com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao imprimir');
      if (!bluetoothPrinter.isConnected()) setConnected(false);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {connected ? (
        <>
          <Badge variant="outline" className="gap-1 text-xs border-primary/30 text-primary">
            <BluetoothConnected className="w-3 h-3" />
            Conectado
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={!sale || printing}
          >
            {printing ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Printer className="w-4 h-4 mr-1" />
            )}
            Imprimir
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDisconnect}>
            <Bluetooth className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleConnect}
          disabled={connecting}
        >
          {connecting ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Bluetooth className="w-4 h-4 mr-1" />
          )}
          Conectar Impressora
        </Button>
      )}
    </div>
  );
};

export default BluetoothPrintButton;
