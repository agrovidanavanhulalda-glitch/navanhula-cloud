import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Warehouse, 
  Package, 
  MapPin, 
  Activity, 
  AlertTriangle,
  Plus,
  ArrowRightLeft,
  Settings
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

const WarehouseManagement: React.FC = () => {
  const { company } = useAuth();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (company?.id) loadWarehouses();
  }, [company?.id]);

  const loadWarehouses = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('warehouses')
      .select('*')
      .eq('company_id', company?.id);
    setWarehouses(data || []);
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Warehouse className="w-8 h-8 text-primary" />
            Gestão de Armazéns
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Controlo multi-armazém e localizações físicas enterprise.
          </p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" />
          Novo Armazém
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-xl bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Capacidade Total</p>
                <p className="text-3xl font-black">94%</p>
              </div>
            </div>
            <div className="mt-4 h-2 bg-primary/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[94%]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-gradient-to-br from-orange-500/10 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <ArrowRightLeft className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Transferências Ativas</p>
                <p className="text-3xl font-black">12</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-gradient-to-br from-destructive/10 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/20 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Ruptura de Stock</p>
                <p className="text-3xl font-black text-destructive">4</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Armazéns Ativos
            </CardTitle>
            <Badge variant="outline" className="font-mono">{warehouses.length} unidades</Badge>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {warehouses.map(w => (
                <div key={w.id} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-border/50 hover:border-primary/50 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Warehouse className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{w.name}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {w.address || 'Sem morada'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={w.is_active ? "default" : "secondary"}>
                      {w.is_active ? 'Operacional' : 'Inativo'}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Capacidade: {w.capacity || 0}m³</p>
                  </div>
                </div>
              ))}
              {warehouses.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                  <Warehouse className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Nenhum armazém configurado.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Inteligência de Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/10">
                <h5 className="font-bold text-primary flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4" />
                  Previsão de Reabastecimento
                </h5>
                <p className="text-sm text-muted-foreground">
                  IA sugere reabastecer 14 produtos nos próximos 5 dias baseado no histórico de vendas.
                </p>
                <Button variant="link" className="p-0 h-auto text-primary text-xs font-bold mt-2">
                  VER RECOMENDAÇÕES →
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-border/50 bg-secondary/20">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Giro de Stock</p>
                  <p className="text-2xl font-black">4.2x</p>
                  <p className="text-[10px] text-green-600 font-bold mt-1">+12% vs mês anterior</p>
                </div>
                <div className="p-4 rounded-2xl border border-border/50 bg-secondary/20">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Lead Time Médio</p>
                  <p className="text-2xl font-black">3.5 dias</p>
                  <p className="text-[10px] text-orange-600 font-bold mt-1">+0.5 dias de atraso</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WarehouseManagement;