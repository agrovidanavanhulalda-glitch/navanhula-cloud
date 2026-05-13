import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, FileDown, Send, PackageCheck, X, MessageCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { downloadPurchaseOrderPdf, PurchaseOrderPdfData } from '@/lib/generatePurchaseOrderPdf';
import { toast } from 'sonner';

interface OrderItem {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total: number;
  received_quantity: number;
}

interface Product {
  id: string;
  name: string;
  cost_price: number;
  sale_price: number;
}

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface PurchaseOrderDetailProps {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground', icon: '📝' },
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '🟡' },
  sent: { label: 'Enviado', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: '🔵' },
  confirmed: { label: 'Confirmado', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: '🟢' },
  approved: { label: 'Aprovado', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: '🟢' },
  received: { label: 'Recebido', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: '🟣' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: '🔴' },
};

const PurchaseOrderDetail: React.FC<PurchaseOrderDetailProps> = ({ orderId, open, onClose, onUpdated }) => {
  const { user, company } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // New item form
  const [newProductId, setNewProductId] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newCost, setNewCost] = useState(0);

  useEffect(() => {
    if (open && orderId) {
      loadOrder();
      loadProducts();
    }
  }, [open, orderId]);

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, cost_price, sale_price').eq('is_active', true).order('name');
    if (data) setProducts(data);
  };

  const loadOrder = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from('purchase_orders').select('*, suppliers(*)').eq('id', orderId).single(),
        supabase.from('purchase_order_items').select('*, products(name)').eq('order_id', orderId),
      ]);

      if (orderRes.data) {
        setOrder(orderRes.data);
        const suppData = (orderRes.data as any).suppliers;
        if (suppData) setSupplier(suppData);
      }

      if (itemsRes.data) {
        setItems(itemsRes.data.map((it: any) => ({
          id: it.id,
          product_id: it.product_id,
          product_name: it.products?.name || 'Produto removido',
          quantity: it.quantity,
          unit_cost: Number(it.unit_cost),
          total: Number(it.total),
          received_quantity: it.received_quantity || 0,
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const orderTotal = useMemo(() => items.reduce((s, i) => s + i.total, 0), [items]);

  const canEdit = order && (order.status === 'draft' || order.status === 'pending');

  const handleAddItem = async () => {
    if (!newProductId || newQty <= 0) { toast.error('Selecione um produto e quantidade'); return; }
    const product = products.find(p => p.id === newProductId);
    if (!product) return;

    const cost = newCost > 0 ? newCost : product.cost_price;
    const total = cost * newQty;

    try {
      const { error } = await supabase.from('purchase_order_items').insert({
        order_id: orderId!,
        product_id: newProductId,
        quantity: newQty,
        unit_cost: cost,
        total,
      });
      if (error) throw error;

      // Update order total
      await supabase.from('purchase_orders').update({ total: orderTotal + total }).eq('id', orderId!);

      setNewProductId('');
      setNewQty(1);
      setNewCost(0);
      loadOrder();
      toast.success('Item adicionado');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRemoveItem = async (itemId: string, itemTotal: number) => {
    try {
      const { error } = await supabase.from('purchase_order_items').delete().eq('id', itemId);
      if (error) throw error;
      await supabase.from('purchase_orders').update({ total: Math.max(0, orderTotal - itemTotal) }).eq('id', orderId!);
      loadOrder();
      toast.success('Item removido');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'approved') updateData.approved_by = user?.id;
      if (newStatus === 'received') updateData.received_at = new Date().toISOString();

      const { error } = await supabase.from('purchase_orders').update(updateData).eq('id', orderId!);
      if (error) throw error;

      // On receive → update stock and create accounts payable
      if (newStatus === 'received') {
        await handleReceiveMerchandise();
      }

      toast.success(`Pedido ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      loadOrder();
      onUpdated();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReceiveMerchandise = async () => {
    // Update stock for each item using the new movement architecture
    for (const item of items) {
      if (!item.product_id) continue;

      const storeId = user?.store_id;
      if (!storeId || !company?.id) continue;

      // Inserir movimento de entrada
      const { error: movError } = await supabase.from('inventory_movements').insert({
        company_id: company.id,
        branch_id: storeId,
        product_id: item.product_id,
        movement_type: 'ENTRY',
        quantity: item.quantity,
        reference_type: 'PURCHASE_ORDER',
        reference_id: orderId,
        created_by: user.id
      });

      if (movError) {
        console.error('Erro ao registrar movimento de estoque:', movError);
        continue;
      }

      // Get current stock for cost average calculation
      const { data: stockRow } = await supabase
        .from('product_stock')
        .select('quantity')
        .eq('product_id', item.product_id)
        .eq('store_id', storeId)
        .maybeSingle();
      
      const currentQty = Number(stockRow?.quantity || 0);

      // Update product cost price (weighted average)
      const { data: productData } = await supabase.from('products').select('cost_price').eq('id', item.product_id).single();
      if (productData) {
        const oldCost = Number(productData.cost_price);
        const newAvgCost = currentQty + item.quantity > 0
          ? ((currentQty * oldCost) + (item.quantity * item.unit_cost)) / (currentQty + item.quantity)
          : item.unit_cost;
        await supabase.from('products').update({ cost_price: Math.round(newAvgCost * 100) / 100 }).eq('id', item.product_id);
      }

      // Mark item as received
      await supabase.from('purchase_order_items').update({ received_quantity: item.quantity }).eq('id', item.id!);
    }

    // Create accounts payable entry
    if (company?.id && supplier) {
      await supabase.from('accounts_payable').insert({
        company_id: company.id,
        store_id: user?.store_id || null,
        supplier_id: supplier.id,
        description: `Pedido de Compra #${order?.id?.slice(0, 8).toUpperCase()}`,
        amount: orderTotal,
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: 'pendente',
        created_by: user?.id,
      });
    }

    toast.success('Estoque atualizado e conta a pagar criada');
  };

  const handleDownloadPdf = () => {
    if (!order || !supplier) return;
    const pdfData: PurchaseOrderPdfData = {
      orderNumber: order.id.slice(0, 8).toUpperCase(),
      orderDate: new Date(order.created_at).toLocaleDateString('pt-MZ'),
      companyName: company?.name || 'NAVANHULA CLOUD',
      companyNuit: company?.nif || undefined,
      companyPhone: company?.phone || undefined,
      companyAddress: company?.address || undefined,
      supplierName: supplier.name,
      supplierPhone: supplier.phone || undefined,
      supplierEmail: supplier.email || undefined,
      supplierAddress: supplier.address || undefined,
      items: items.map(i => ({ name: i.product_name, quantity: i.quantity, unitCost: i.unit_cost, total: i.total })),
      total: orderTotal,
      notes: order.notes || undefined,
      status: order.status,
    };
    downloadPurchaseOrderPdf(pdfData);
  };

  const handleSendWhatsApp = () => {
    if (!supplier?.phone) { toast.error('Fornecedor sem número de telefone'); return; }
    const phone = supplier.phone.replace(/\D/g, '');
    const itemsList = items.map(i => `• ${i.product_name} x${i.quantity} = ${formatCurrency(i.total)}`).join('\n');
    const message = encodeURIComponent(
      `Olá ${supplier.name},\n\nSegue o pedido de compra Nº ${order?.id?.slice(0, 8).toUpperCase()}.\n\n${itemsList}\n\n*Total: ${formatCurrency(orderTotal)}*\n\nEnviado via NAVANHULA CLOUD.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');

    // Update status to sent
    if (order?.status === 'draft' || order?.status === 'pending') {
      handleStatusChange('sent');
    }
  };

  const statusCfg = STATUS_CONFIG[order?.status || 'draft'] || STATUS_CONFIG.draft;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              Pedido #{order?.id?.slice(0, 8).toUpperCase() || '...'}
              <Badge className={statusCfg.color}>{statusCfg.icon} {statusCfg.label}</Badge>
            </DialogTitle>
          </div>
          {supplier && (
            <p className="text-sm text-muted-foreground">
              Fornecedor: <strong>{supplier.name}</strong>
              {supplier.phone && ` • ${supplier.phone}`}
            </p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-4">
            {/* Items table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                <div className="col-span-5">Produto</div>
                <div className="col-span-2 text-center">Qtd</div>
                <div className="col-span-2 text-right">Custo</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-1" />
              </div>

              {items.map(item => (
                <div key={item.id} className="grid grid-cols-12 gap-2 px-3 py-2 border-t items-center text-sm">
                  <div className="col-span-5 truncate">{item.product_name}</div>
                  <div className="col-span-2 text-center">{item.quantity}</div>
                  <div className="col-span-2 text-right">{formatCurrency(item.unit_cost)}</div>
                  <div className="col-span-2 text-right font-medium">{formatCurrency(item.total)}</div>
                  <div className="col-span-1 flex justify-end">
                    {canEdit && (
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id!, item.total)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">Nenhum item adicionado</div>
              )}
            </div>

            {/* Total */}
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total do Pedido</p>
                <p className="text-2xl font-bold">{formatCurrency(orderTotal)}</p>
              </div>
            </div>

            {/* Add item form */}
            {canEdit && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-muted-foreground">ADICIONAR PRODUTO</Label>
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Select value={newProductId} onValueChange={v => {
                        setNewProductId(v);
                        const p = products.find(pp => pp.id === v);
                        if (p) setNewCost(p.cost_price);
                      }}>
                        <SelectTrigger><SelectValue placeholder="Produto..." /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min={1} value={newQty} onChange={e => setNewQty(Number(e.target.value))} placeholder="Qtd" />
                    </div>
                    <div className="col-span-3">
                      <Input type="number" min={0} step={0.01} value={newCost} onChange={e => setNewCost(Number(e.target.value))} placeholder="Custo" />
                    </div>
                    <div className="col-span-2">
                      <Button onClick={handleAddItem} size="sm" className="w-full">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Alerts */}
            {order?.status === 'draft' && items.length > 0 && (
              <Card className="p-3 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Pedido em rascunho. Envie ao fornecedor quando estiver pronto.
                </div>
              </Card>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-wrap gap-2">
          {/* Action buttons based on status */}
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={items.length === 0}>
            <FileDown className="w-4 h-4 mr-1" /> PDF
          </Button>

          {supplier?.phone && (order?.status === 'draft' || order?.status === 'pending' || order?.status === 'sent') && (
            <Button variant="outline" size="sm" onClick={handleSendWhatsApp} disabled={items.length === 0}>
              <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
            </Button>
          )}

          {(order?.status === 'draft') && (
            <Button size="sm" onClick={() => handleStatusChange('sent')} disabled={saving || items.length === 0}>
              <Send className="w-4 h-4 mr-1" /> Enviar Pedido
            </Button>
          )}

          {(order?.status === 'sent' || order?.status === 'pending') && (
            <Button size="sm" onClick={() => handleStatusChange('confirmed')} disabled={saving}>
              Confirmar
            </Button>
          )}

          {(order?.status === 'confirmed' || order?.status === 'approved' || order?.status === 'sent') && (
            <Button size="sm" onClick={() => handleStatusChange('received')} disabled={saving}>
              <PackageCheck className="w-4 h-4 mr-1" /> Receber Mercadoria
            </Button>
          )}

          {canEdit && (
            <Button variant="destructive" size="sm" onClick={() => handleStatusChange('cancelled')} disabled={saving}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseOrderDetail;
