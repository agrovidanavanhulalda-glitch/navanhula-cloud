import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Warehouse, 
  QrCode, 
  Activity, 
  ClipboardCheck, 
  Box,
  Truck
} from 'lucide-react';
import WarehouseManagement from '@/components/inventory/WarehouseManagement';
import BarcodeManager from '@/components/inventory/BarcodeManager';
import PageTransition from '@/components/layout/PageTransition';

const WMSDashboard: React.FC = () => {
  return (
    <PageTransition>
      <div className="p-6 space-y-8 bg-background/50 min-h-screen">
        <Tabs defaultValue="warehouses" className="w-full">
          <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2 scrollbar-hide">
            <TabsList className="bg-secondary/50 p-1 h-14 rounded-2xl border border-border/50 backdrop-blur-xl">
              <TabsTrigger value="warehouses" className="rounded-xl px-6 h-12 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2 font-bold uppercase tracking-tight text-xs">
                <Warehouse className="w-4 h-4" />
                Armazéns
              </TabsTrigger>
              <TabsTrigger value="barcodes" className="rounded-xl px-6 h-12 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2 font-bold uppercase tracking-tight text-xs">
                <QrCode className="w-4 h-4" />
                Etiquetas & Scan
              </TabsTrigger>
              <TabsTrigger value="audits" className="rounded-xl px-6 h-12 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2 font-bold uppercase tracking-tight text-xs">
                <ClipboardCheck className="w-4 h-4" />
                Auditorias
              </TabsTrigger>
              <TabsTrigger value="transfers" className="rounded-xl px-6 h-12 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2 font-bold uppercase tracking-tight text-xs">
                <Truck className="w-4 h-4" />
                Transferências
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="warehouses" className="animate-in fade-in zoom-in-95 duration-500 focus-visible:outline-none">
            <WarehouseManagement />
          </TabsContent>
          
          <TabsContent value="barcodes" className="animate-in fade-in zoom-in-95 duration-500 focus-visible:outline-none">
            <BarcodeManager />
          </TabsContent>

          <TabsContent value="audits" className="animate-in fade-in zoom-in-95 duration-500">
            <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-sm p-12 text-center">
              <ClipboardCheck className="w-20 h-20 mx-auto mb-6 text-primary opacity-20" />
              <h3 className="text-2xl font-black mb-2">Módulo de Auditoria Enterprise</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Implementando contagem cíclica e reconciliação automática de stock com IA.
              </p>
              <Button className="mt-8 gap-2 px-8 py-6 text-lg rounded-2xl shadow-xl shadow-primary/20">
                Iniciar Auditoria Manual
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="transfers" className="animate-in fade-in zoom-in-95 duration-500">
             <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-sm p-12 text-center">
              <Truck className="w-20 h-20 mx-auto mb-6 text-primary opacity-20" />
              <h3 className="text-2xl font-black mb-2">Fluxo de Transferências</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Monitorize o stock em trânsito entre armazéns e filiais em tempo real.
              </p>
              <Button className="mt-8 gap-2 px-8 py-6 text-lg rounded-2xl shadow-xl shadow-primary/20">
                Nova Guia de Remessa
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default WMSDashboard;