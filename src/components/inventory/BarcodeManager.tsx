import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  QrCode, 
  Barcode, 
  Printer, 
  Maximize, 
  Search,
  Camera,
  Layers
} from 'lucide-react';
import BarcodeScanner from '@/components/pos/BarcodeScanner';
import { toast } from 'sonner';

const BarcodeManager: React.FC = () => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const handleScan = (code: string) => {
    setLastScan(code);
    setIsScannerOpen(false);
    toast.success(`Código detectado: ${code}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <QrCode className="w-8 h-8 text-primary" />
            Central de Etiquetas & Barcode
          </h1>
          <p className="text-muted-foreground">Gestão internacional de Code128, QRCode e RFID.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimir Lote
          </Button>
          <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => setIsScannerOpen(true)}>
            <Camera className="w-4 h-4" />
            Abrir Scanner
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-2 border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="w-5 h-5 text-primary" />
              Busca Rápida de Produto
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="relative">
              <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Bipe o código de barras ou digite..." 
                className="pl-12 h-14 text-lg font-mono tracking-widest border-2 focus-visible:ring-primary/20"
                value={lastScan || ''}
                onChange={(e) => setLastScan(e.target.value)}
              />
            </div>
            
            {lastScan && (
              <div className="mt-8 p-6 rounded-3xl bg-secondary/30 border border-primary/20 animate-in slide-in-from-bottom-4">
                <div className="flex gap-6">
                  <div className="w-32 h-32 bg-white rounded-2xl p-2 flex items-center justify-center shadow-inner">
                    <QrCode className="w-24 h-24 text-black" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-2xl font-black">iPhone 15 Pro Max</h3>
                    <p className="font-mono text-muted-foreground text-sm uppercase tracking-widest">{lastScan}</p>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="secondary" className="h-8">Gerar PDF</Button>
                      <Button size="sm" variant="secondary" className="h-8">Editar Barcode</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="w-5 h-5 text-primary" />
              Formatos Suportados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
              <span className="text-sm font-bold">EAN-13 / UPC</span>
              <div className="h-2 w-12 bg-green-500 rounded-full" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
              <span className="text-sm font-bold">Code 128 (B2B)</span>
              <div className="h-2 w-12 bg-green-500 rounded-full" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
              <span className="text-sm font-bold">QR Code Dynamic</span>
              <div className="h-2 w-12 bg-primary rounded-full animate-pulse" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
              <span className="text-sm font-bold">Data Matrix (WMS)</span>
              <div className="h-2 w-12 bg-green-500 rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      <BarcodeScanner 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScan={handleScan} 
      />
    </div>
  );
};

export default BarcodeManager;