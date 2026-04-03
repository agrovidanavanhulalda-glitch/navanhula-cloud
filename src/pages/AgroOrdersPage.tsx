import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Package, CheckCircle, Truck, XCircle, Clock, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';

interface AgroOrder {
  id: string;
  cliente_nome: string;
  cliente_contacto: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
  status: string;
  created_at: string;
  producer: { nome_granja: string; tipo_produto: string } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: <Clock className="w-3 h-3" /> },
  confirmado: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: <Package className="w-3 h-3" /> },
  em_transporte: { label: 'Em Transporte', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: <Truck className="w-3 h-3" /> },
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-800 border-green-300', icon: <CheckCircle className="w-3 h-3" /> },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800 border-red-300', icon: <XCircle className="w-3 h-3" /> },
};

const nextStatus: Record<string, string> = {
  pendente: 'confirmado',
  confirmado: 'em_transporte',
  em_transporte: 'entregue',
};

const AgroOrdersPage: React.FC = () => {
  const { company } = useAuth();
  const companyId = company?.id;
  const [orders, setOrders] = useState<AgroOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) fetchOrders();
  }, [companyId]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agro_orders')
      .select('*, producer:agro_producers(nome_granja, tipo_produto)')
      .eq('company_id', companyId!)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AgroOrders] Fetch error:', error);
      toast.error('Erro ao carregar pedidos');
    } else {
      setOrders((data as unknown as AgroOrder[]) || []);
    }
    setLoading(false);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    const { data, error } = await supabase.rpc('update_agro_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
    });

    const result = data as unknown as { success: boolean; message?: string } | null;

    if (error || !result?.success) {
      toast.error(result?.message || 'Erro ao atualizar status');
    } else {
      toast.success(`Status atualizado para: ${statusConfig[newStatus]?.label || newStatus}`);
      fetchOrders();
    }
    setUpdatingId(null);
  };

  const filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus);

  const stats = {
    total: orders.length,
    pendente: orders.filter(o => o.status === 'pendente').length,
    entregue: orders.filter(o => o.status === 'entregue').length,
    revenue: orders.filter(o => o.status === 'entregue').reduce((s, o) => s + o.total, 0),
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            Pedidos AGRO
          </h1>
          <p className="text-sm text-muted-foreground">Gestão de pedidos do marketplace avícola</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Pedidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pendente}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.entregue}</p>
            <p className="text-xs text-muted-foreground">Entregues</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.revenue.toFixed(0)} MT</p>
            <p className="text-xs text-muted-foreground">Receita Entregue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="confirmado">Confirmado</SelectItem>
            <SelectItem value="em_transporte">Em Transporte</SelectItem>
            <SelectItem value="entregue">Entregue</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar'}
        </Button>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum pedido encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produtor</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order) => {
                    const sc = statusConfig[order.status] || statusConfig.pendente;
                    const next = nextStatus[order.status];
                    const isTerminal = order.status === 'entregue' || order.status === 'cancelado';
                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm text-foreground">{order.producer?.nome_granja || '—'}</p>
                            <p className="text-xs text-muted-foreground capitalize">{order.producer?.tipo_produto}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm text-foreground">{order.cliente_nome}</p>
                            <p className="text-xs text-muted-foreground">{order.cliente_contacto}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{order.quantidade}</TableCell>
                        <TableCell className="text-right font-bold text-primary">{order.total.toFixed(2)} MT</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${sc.color}`}>
                            {sc.icon} {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {next && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={updatingId === order.id}
                                onClick={() => handleStatusChange(order.id, next)}
                              >
                                {updatingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : statusConfig[next]?.label}
                              </Button>
                            )}
                            {!isTerminal && (
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={updatingId === order.id}
                                onClick={() => handleStatusChange(order.id, 'cancelado')}
                              >
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgroOrdersPage;
