import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Package, CheckCircle, Truck, XCircle, Clock, ShoppingCart, MessageCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/formatters';

interface AgroOrder {
  id: string;
  cliente_nome: string;
  cliente_contacto: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
  status: string;
  payment_status: string;
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

const paymentConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: <Clock className="w-3 h-3" /> },
  pago: { label: 'Pago', color: 'bg-green-100 text-green-800 border-green-300', icon: <CheckCircle className="w-3 h-3" /> },
  falhado: { label: 'Falhado', color: 'bg-red-100 text-red-800 border-red-300', icon: <AlertTriangle className="w-3 h-3" /> },
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

  const handlePaymentConfirm = async (orderId: string) => {
    setUpdatingId(orderId);
    const { error } = await supabase
      .from('agro_orders')
      .update({ payment_status: 'pago' } as any)
      .eq('id', orderId);

    if (error) {
      toast.error('Erro ao confirmar pagamento');
    } else {
      toast.success('Pagamento confirmado!');
      fetchOrders();
    }
    setUpdatingId(null);
  };

  const handlePaymentFailed = async (orderId: string) => {
    setUpdatingId(orderId);
    const { error } = await supabase
      .from('agro_orders')
      .update({ payment_status: 'falhado' } as any)
      .eq('id', orderId);

    if (error) {
      toast.error('Erro ao marcar pagamento');
    } else {
      toast.success('Pagamento marcado como falhado');
      fetchOrders();
    }
    setUpdatingId(null);
  };

  const filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus);

  const stats = {
    total: orders.length,
    pendente: orders.filter(o => ['pendente', 'confirmado', 'em_transporte'].includes(o.status)).length,
    entregue: orders.filter(o => o.status === 'entregue').length,
    revenuePaid: orders.filter(o => o.payment_status === 'pago').reduce((s, o) => s + o.total, 0),
    revenuePending: orders.filter(o => o.payment_status === 'pendente' && o.status !== 'cancelado').reduce((s, o) => s + o.total, 0),
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-primary" />
          Pedidos AGRO
        </h1>
        <p className="text-sm text-muted-foreground">Gestão de pedidos do marketplace avícola</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Pedidos</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.pendente}</p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.entregue}</p>
          <p className="text-xs text-muted-foreground">Entregues</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.revenuePaid)}</p>
          <p className="text-xs text-muted-foreground">Receita Paga</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.revenuePending)}</p>
          <p className="text-xs text-muted-foreground">Receita Pendente</p>
        </CardContent></Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar status" /></SelectTrigger>
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

      {/* Table */}
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
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order) => {
                    const sc = statusConfig[order.status] || statusConfig.pendente;
                    const pc = paymentConfig[order.payment_status] || paymentConfig.pendente;
                    const next = nextStatus[order.status];
                    const isTerminal = order.status === 'entregue' || order.status === 'cancelado';
                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <p className="font-medium text-sm text-foreground">{order.producer?.nome_granja || '—'}</p>
                          <p className="text-xs text-muted-foreground capitalize">{order.producer?.tipo_produto}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground">{order.cliente_nome}</p>
                          <p className="text-xs text-muted-foreground">{order.cliente_contacto}</p>
                        </TableCell>
                        <TableCell className="text-right font-medium">{order.quantidade}</TableCell>
                        <TableCell className="text-right font-bold text-primary">{formatCurrency(order.total)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${sc.color}`}>{sc.icon} {sc.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${pc.color}`}>{pc.icon} {pc.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {next && (
                              <Button size="sm" variant="outline" disabled={updatingId === order.id} onClick={() => handleStatusChange(order.id, next)}>
                                {updatingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : statusConfig[next]?.label}
                              </Button>
                            )}
                            {order.payment_status === 'pendente' && order.status !== 'cancelado' && (
                              <Button size="sm" variant="default" disabled={updatingId === order.id} onClick={() => handlePaymentConfirm(order.id)} className="gap-1">
                                <DollarSign className="w-3 h-3" /> Pago
                              </Button>
                            )}
                            {order.payment_status === 'pendente' && order.status !== 'cancelado' && (
                              <Button size="sm" variant="ghost" className="text-destructive" disabled={updatingId === order.id} onClick={() => handlePaymentFailed(order.id)}>
                                Falhado
                              </Button>
                            )}
                            {!isTerminal && (
                              <Button size="sm" variant="destructive" disabled={updatingId === order.id} onClick={() => handleStatusChange(order.id, 'cancelado')}>
                                Cancelar
                              </Button>
                            )}
                            {order.cliente_contacto && (
                              <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700" asChild>
                                <a
                                  href={`https://wa.me/${order.cliente_contacto.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${order.cliente_nome}, o seu pedido de ${order.quantidade} unidades (${formatCurrency(order.total)}) está ${sc.label}. Obrigado!`)}`}
                                  target="_blank" rel="noopener noreferrer"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </a>
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
