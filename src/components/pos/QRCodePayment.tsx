import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { Check, QrCode, RefreshCw } from 'lucide-react';

interface QRCodePaymentProps {
  total: number;
  storeId: string;
  storeName: string;
  onConfirm: () => void;
  saleReference?: string;
}

const QRCodePayment: React.FC<QRCodePaymentProps> = ({
  total,
  storeId,
  storeName,
  onConfirm,
  saleReference,
}) => {
  const qrData = useMemo(() => {
    const ref = saleReference || `NAV-${Date.now().toString(36).toUpperCase()}`;
    return JSON.stringify({
      app: 'NAVANHULA_PAY',
      store: storeId,
      storeName,
      amount: total,
      currency: 'MZN',
      ref,
      ts: Date.now(),
    });
  }, [total, storeId, storeName, saleReference]);

  const reference = saleReference || qrData && JSON.parse(qrData).ref;

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <QrCode className="w-8 h-8 mx-auto text-primary" />
        <p className="font-semibold text-lg">Pagamento via QR Code</p>
        <p className="text-sm text-muted-foreground">
          Cliente escaneia o código para pagar
        </p>
      </div>

      {/* QR Code Display */}
      <Card className="p-6 flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-xl shadow-inner">
          <QRCodeSVG
            value={qrData}
            size={200}
            level="H"
            includeMargin
            fgColor="#1a1a2e"
            bgColor="#ffffff"
          />
        </div>
        <div className="text-center space-y-1">
          <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
          <Badge variant="secondary" className="font-mono text-xs">
            Ref: {reference}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {storeName}
        </p>
      </Card>

      {/* Instructions */}
      <Card className="p-3 bg-secondary/50">
        <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
          <li>Cliente abre app de pagamento (M-Pesa, E-Mola, mKesh)</li>
          <li>Escaneia o QR Code acima</li>
          <li>Confirma o pagamento no telemóvel</li>
          <li>Confirme abaixo quando receber o pagamento</li>
        </ol>
      </Card>

      {/* Confirm Button */}
      <Button
        className="w-full h-14 text-lg"
        onClick={onConfirm}
      >
        <Check className="w-5 h-5 mr-2" />
        Pagamento Recebido — Confirmar
      </Button>
    </div>
  );
};

export default QRCodePayment;
