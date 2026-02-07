import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { LocalSale } from '@/contexts/LocalPOSContext';

interface CancelSaleDialogProps {
  sale: LocalSale;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const CancelSaleDialog: React.FC<CancelSaleDialogProps> = ({
  sale,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('Motivo do cancelamento é obrigatório');
      return;
    }
    if (reason.trim().length < 5) {
      setError('Motivo deve ter pelo menos 5 caracteres');
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="w-5 h-5" />
            Cancelar Venda
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. O estoque será restaurado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Sale Summary */}
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 mb-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-semibold">Atenção</span>
            </div>
            <div className="space-y-1 text-sm">
              <p><strong>Código:</strong> #{sale.id.slice(-6).toUpperCase()}</p>
              <p><strong>Valor:</strong> {formatCurrency(sale.total)}</p>
              <p><strong>Data:</strong> {new Date(sale.createdAt).toLocaleString('pt-MZ')}</p>
              <p><strong>Itens:</strong> {sale.items.length}</p>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-destructive">
              Motivo do Cancelamento *
            </Label>
            <Textarea
              id="reason"
              placeholder="Descreva o motivo do cancelamento..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              className="min-h-[100px]"
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            Voltar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={!reason.trim()}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Confirmar Cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelSaleDialog;
