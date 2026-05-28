import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, RefreshCw, Package, ArrowRightLeft, CornerDownLeft } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface StockMovement {
  id: string;
  movement_type: string;
  quantity: number;
  reference_type: string | null;
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
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: movements.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 74,
    overscan: 5,
  });

  useEffect(() => {
    if (open && productId) {
      loadMovements();
    }
  }, [open, productId]);

  const loadMovements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setMovements((data as StockMovement[]) || []);
    } catch (err) {
      console.error('Erro ao carregar movimentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string, quantity: number) => {
    switch (type) {
      case 'ENTRY': return <ArrowDown className="w-4 h-4 text-green-600" />;
      case 'SALE': return <ArrowUp className="w-4 h-4 text-destructive" />;
      case 'RETURN': return <CornerDownLeft className="w-4 h-4 text-blue-600" />;
      case 'TRANSFER': return <ArrowRightLeft className="w-4 h-4 text-orange-600" />;
      case 'ADJUSTMENT': return <RefreshCw className="w-4 h-4 text-slate-600" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: string, quantity: number) => {
    switch (type) {
      case 'ENTRY': return <Badge className="bg-green-100 text-green-700 border-green-200">Entrada</Badge>;
      case 'SALE': return <Badge variant="destructive">Venda</Badge>;
      case 'RETURN': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Retorno</Badge>;
      case 'TRANSFER': return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Transferência</Badge>;
      case 'ADJUSTMENT': return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Ajuste</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getRefLabel = (ref: string | null) => {
    switch (ref) {
      case 'PURCHASE_ORDER': return 'Compra';
      case 'SALE': return 'Venda';
      case 'SALE_CANCEL': return 'Cancelamento';
      case 'MANUAL_ADJUSTMENT': return 'Manual';
      case 'TRANSFER_OUT': return 'Saída Transf.';
      case 'TRANSFER_IN': return 'Entrada Transf.';
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

        <ScrollArea className="max-h-[60vh] mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>Carregando...</span>
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Nenhuma movimentação registrada para este produto.</p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-all shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {getTypeIcon(m.movement_type, m.quantity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeBadge(m.movement_type, m.quantity)}
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {getRefLabel(m.reference_type)}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-lg font-black ${m.quantity > 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {m.quantity > 0 ? '+' : ''}{m.quantity}
                      </span>
                      <span className="text-xs text-muted-foreground">unidades</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-[#0B1F3A]">
                      {format(new Date(m.created_at), 'dd/MM/yyyy')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(m.created_at), 'HH:mm')}
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