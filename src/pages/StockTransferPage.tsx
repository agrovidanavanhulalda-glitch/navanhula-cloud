import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Package, Send, CheckCircle, Clock, Filter, Plus, Trash2, ArrowRightLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface TransferItem {
  product_id: string;
  product_name: string;
  quantity: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30', icon: <Clock className="w-3 h-3" /> },
  CONFIRMED: { label: 'Confirmado', color: 'bg-green-500/20 text-green-700 border-green-500/30', icon: <CheckCircle className="w-3 h-3" /> },
  FORCED_CONFIRMED: { label: 'Forçado', color: 'bg-blue-500/20 text-blue-700 border-blue-500/30', icon: <CheckCircle className="w-3 h-3" /> },
};

export default function StockTransferPage() {
  const { user, company, role } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin' || role === 'ceo' || role === 'manager';

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSalesman, setSelectedSalesman] = useState('');
  const [items, setItems] = useState<TransferItem[]>([]);
  const [notes, setNotes] = useState('');

  // Fetch sellers
  const { data: sellers = [] } = useQuery({
    queryKey: ['sellers-for-transfer', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('company_id', company.id)
        .eq('is_active', true);
      return data || [];
    },
    enabled: isAdmin && !!company?.id,
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-transfer'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  // Fetch transfers
  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['stock-transfers', company?.id, filterStatus],
    queryFn: async () => {
      if (!company?.id) return [];
      let q = supabase
        .from('stock_transfers')
        .select('*, stock_transfer_items(*, products:product_id(name, code))')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        q = q.eq('status', filterStatus);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  // Fetch salesman names for display
  const salesmanIds = [...new Set(transfers.map((t: any) => t.to_salesman_id))];
  const { data: salesmanNames = {} } = useQuery({
    queryKey: ['salesman-names', salesmanIds.join(',')],
    queryFn: async () => {
      if (salesmanIds.length === 0) return {};
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', salesmanIds);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.full_name; });
      return map;
    },
    enabled: salesmanIds.length > 0,
  });

  // Pending count
  const pendingCount = transfers.filter((t: any) => t.status === 'PENDING').length;

  // Create transfer mutation
  const createTransfer = useMutation({
    mutationFn: async () => {
      if (!selectedSalesman || items.length === 0 || !company?.id || !user?.id) {
        throw new Error('Preencha todos os campos');
      }

      const { data: transfer, error: transferError } = await supabase
        .from('stock_transfers')
        .insert({
          company_id: company.id,
          from_admin_id: user.id,
          to_salesman_id: selectedSalesman,
          notes,
          status: 'PENDING',
        })
        .select()
        .single();

      if (transferError) throw transferError;

      const transferItems = items.map(item => ({
        transfer_id: transfer.id,
        product_id: item.product_id,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('stock_transfer_items')
        .insert(transferItems);

      if (itemsError) throw itemsError;
      return transfer;
    },
    onSuccess: () => {
      toast.success('Transferência criada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      setDialogOpen(false);
      setSelectedSalesman('');
      setItems([]);
      setNotes('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Confirm transfer (seller)
  const confirmTransfer = useMutation({
    mutationFn: async (transferId: string) => {
      const { data, error } = await supabase.rpc('confirm_stock_transfer', { p_transfer_id: transferId });
      if (error) throw error;
      if (data && !(data as any).success) throw new Error((data as any).message);
      return data;
    },
    onSuccess: () => {
      toast.success('Recebimento confirmado');
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Force confirm (admin)
  const forceConfirm = useMutation({
    mutationFn: async (transferId: string) => {
      const { data, error } = await supabase.rpc('force_confirm_stock_transfer', { p_transfer_id: transferId });
      if (error) throw error;
      if (data && !(data as any).success) throw new Error((data as any).message);
      return data;
    },
    onSuccess: () => {
      toast.success('Confirmação forçada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addItem = () => {
    setItems([...items, { product_id: '', product_name: '', quantity: 1 }]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof TransferItem, value: any) => {
    const updated = [...items];
    if (field === 'product_id') {
      const prod = products.find((p: any) => p.id === value);
      updated[idx] = { ...updated[idx], product_id: value, product_name: prod?.name || '' };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setItems(updated);
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">
              {isAdmin ? 'Transferência de Stock' : 'Recebimentos de Stock'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? 'Envie stock para vendedores' : 'Confirme os recebimentos'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </Badge>
          )}
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Send className="w-4 h-4 mr-1" /> Nova Transferência
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Transferência de Stock</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Vendedor</label>
                    <Select value={selectedSalesman} onValueChange={setSelectedSalesman}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o vendedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {sellers.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.full_name} ({s.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Produtos</label>
                      <Button size="sm" variant="outline" onClick={addItem}>
                        <Plus className="w-3 h-3 mr-1" /> Adicionar
                      </Button>
                    </div>
                    {items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 mb-2 items-end">
                        <div className="flex-1">
                          <Select value={item.product_id} onValueChange={(v) => updateItem(idx, 'product_id', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Produto" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} ({p.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Input
                          type="number"
                          min={1}
                          className="w-20"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                        />
                        <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Clique "Adicionar" para incluir produtos
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Notas (opcional)</label>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações..." />
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => createTransfer.mutate()}
                    disabled={!selectedSalesman || items.length === 0 || items.some(i => !i.product_id) || createTransfer.isPending}
                  >
                    {createTransfer.isPending ? 'Enviando...' : 'Enviar Transferência'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'PENDING', 'CONFIRMED', 'FORCED_CONFIRMED'].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filterStatus === s ? 'default' : 'outline'}
            onClick={() => setFilterStatus(s)}
          >
            {s === 'all' ? 'Todos' : statusConfig[s]?.label || s}
          </Button>
        ))}
      </div>

      {/* Transfers list */}
      <div className="space-y-3">
        {isLoading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
              Nenhuma transferência encontrada
            </CardContent>
          </Card>
        ) : (
          transfers.map((transfer: any) => {
            const config = statusConfig[transfer.status] || statusConfig.PENDING;
            const isMine = transfer.to_salesman_id === user?.id;
            return (
              <Card key={transfer.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={config.color}>
                        {config.icon}
                        <span className="ml-1">{config.label}</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(transfer.created_at).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {transfer.status === 'PENDING' && isMine && (
                        <Button
                          size="sm"
                          onClick={() => confirmTransfer.mutate(transfer.id)}
                          disabled={confirmTransfer.isPending}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> Confirmar
                        </Button>
                      )}
                      {transfer.status === 'PENDING' && isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => forceConfirm.mutate(transfer.id)}
                          disabled={forceConfirm.isPending}
                        >
                          Forçar Confirmação
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-sm mt-1">
                    Para: {(salesmanNames as any)[transfer.to_salesman_id] || 'Vendedor'}
                  </CardTitle>
                  {transfer.notes && (
                    <p className="text-xs text-muted-foreground">{transfer.notes}</p>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(transfer.stock_transfer_items || []).map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">
                            {item.products?.name || 'Produto'}
                          </TableCell>
                          <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
