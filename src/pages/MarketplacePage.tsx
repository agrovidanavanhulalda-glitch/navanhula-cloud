import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, ShoppingCart, Zap, BarChart3 } from 'lucide-react';
import BuyerForm from '@/components/marketplace/BuyerForm';
import BuyerList from '@/components/marketplace/BuyerList';
import OrderForm from '@/components/marketplace/OrderForm';
import MatchingPanel from '@/components/marketplace/MatchingPanel';
import MarketplaceDashboard from '@/components/marketplace/MarketplaceDashboard';

const MarketplacePage: React.FC = () => {
  const [buyerDialogOpen, setBuyerDialogOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => {
    setRefreshKey(k => k + 1);
    setBuyerDialogOpen(false);
    setOrderDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Marketplace Avícola</h1>
          <p className="text-sm text-muted-foreground">Conecte criadores e compradores automaticamente</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={buyerDialogOpen} onOpenChange={setBuyerDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Comprador</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo Comprador</DialogTitle></DialogHeader>
              <BuyerForm onSuccess={refresh} />
            </DialogContent>
          </Dialog>
          <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Pedido</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo Pedido</DialogTitle></DialogHeader>
              <OrderForm onSuccess={refresh} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-1"><BarChart3 className="h-3.5 w-3.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="buyers" className="gap-1"><Users className="h-3.5 w-3.5" /> Compradores</TabsTrigger>
          <TabsTrigger value="orders" className="gap-1"><ShoppingCart className="h-3.5 w-3.5" /> Pedidos</TabsTrigger>
          <TabsTrigger value="matching" className="gap-1"><Zap className="h-3.5 w-3.5" /> Matching</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><MarketplaceDashboard key={refreshKey} /></TabsContent>
        <TabsContent value="buyers"><BuyerList key={refreshKey} /></TabsContent>
        <TabsContent value="orders"><MatchingPanel key={refreshKey} /></TabsContent>
        <TabsContent value="matching"><MatchingPanel key={refreshKey + 1} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketplacePage;
