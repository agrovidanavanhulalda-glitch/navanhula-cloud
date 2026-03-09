import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, ScanLine } from 'lucide-react';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ isOpen, onClose, onScan }) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'barcode-reader';

  useEffect(() => {
    if (!isOpen) return;

    const startScanner = async () => {
      try {
        setError(null);
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.5,
          },
          (decodedText) => {
            onScan(decodedText);
            scanner.stop().catch(() => {});
            onClose();
          },
          () => {} // ignore scan failures
        );
      } catch (err: any) {
        setError(err?.message || 'Não foi possível acessar a câmera');
      }
    };

    // Small delay to ensure DOM is ready
    const timeout = setTimeout(startScanner, 300);

    return () => {
      clearTimeout(timeout);
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [isOpen, onScan, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            Scanner de Código de Barras
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            id={containerId}
            className="w-full rounded-lg overflow-hidden bg-muted min-h-[250px]"
          />

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive text-center">
              {error}
              <p className="text-xs mt-1 text-muted-foreground">
                Verifique se o navegador tem permissão para acessar a câmera.
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center">
            Aponte a câmera para o código de barras do produto
          </p>

          <Button variant="outline" className="w-full" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Fechar Scanner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;
