import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, RefreshCw, Package } from 'lucide-react';

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  unit_cost: number;
  total_cost: number;
  reference_type: string | null;
  reason: string | null;
  created_at: string;
  created_by: string | null;
}

interface Props {
  productId: string;
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StockMovementHistory: React.FC<Props> = ({ productId, productName, open, onOpenChange }) => {
  const { user } = useAuth();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && productId) {
      loadMovements();
    }
  }, [open, productId]);

  const loadMovements = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(50);
    setMovements((data as StockMovement[]) || []);
    setLoading(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'entrada': return <ArrowDown className="w-4 h-4 text-green-600" />;
      case 'saida': return <ArrowUp className="w-4 h-4 text-destructive" />;
      case 'ajuste': return <RefreshCw className="w-4 h-4 text-blue-600" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'entrada': return <Badge className="bg-green-100 text-green-700 border-green-200">Entrada</Badge>;
      case 'saida': return <Badge variant="destructive">Saída</Badge>;
      case 'ajuste': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Ajuste</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getRefLabel = (ref: string | null) => {
    switch (ref) {
      case 'purchase_order': return 'Compra';
      case 'sale': return 'Venda';
      case 'manual': return 'Manual';
      default: return ref || '—';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Movimentações — {productName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              Nenhuma movimentação registrada
            </div>
          ) : (
            <div className="space-y-2">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex-shrink-0">{getTypeIcon(m.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeBadge(m.type)}
                      <span className="text-xs text-muted-foreground">{getRefLabel(m.reference_type)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">{m.previous_stock}</span>
                      <span className="mx-1">→</span>
                      <span className="font-bold">{m.new_stock}</span>
                      <span className="text-muted-foreground ml-1">({m.type === 'saida' ? '-' : '+'}{m.quantity})</span>
                    </div>
                    {m.reason && <p className="text-xs text-muted-foreground mt-1">{m.reason}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium">{formatCurrency(m.unit_cost)}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(m.created_at), 'dd/MM/yy HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default StockMovementHistory;
