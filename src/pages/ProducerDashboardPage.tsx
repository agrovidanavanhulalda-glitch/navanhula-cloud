import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Package, CheckCircle, Truck, XCircle, Clock, Warehouse, MessageCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface ProducerOrder {
  id: string;
  cliente_nome: string;
  cliente_contacto: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
  status: string;
  created_at: string;
}

interface ProducerInfo {
  id: string;
  nome_granja: string;
  tipo_produto: string;
  quantidade_disponivel: number;
  preco: number;
  telefone: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: <Clock className="w-3 h-3" /> },
  confirmado: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: <Package className="w-3 h-3" /> },
  em_transporte: { label: 'Em Transporte', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: <Truck className="w-3 h-3" /> },
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-800 border-green-300', icon: <CheckCircle className="w-3 h-3" /> },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800 border-red-300', icon: <XCircle className="w-3 h-3" /> },
};

const ProducerDashboardPage: React.FC = () => {
  const { company } = useAuth();
  const companyId = company?.id;
  const [producers, setProducers] = useState<ProducerInfo[]>([]);
  const [orders, setOrders] = useState<ProducerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) fetchData();
  }, [companyId]);

  const fetchData = async () => {
    setLoading(true);
    const [prodRes, ordRes] = await Promise.all([
      supabase
        .from('agro_producers')
        .select('id, nome_granja, tipo_produto, quantidade_disponivel, preco, telefone')
        .eq('company_id', companyId!)
        .eq('status', 'ativo'),
      supabase
        .from('agro_orders')
        .select('id, cliente_nome, cliente_contacto, quantidade, preco_unitario, total, status, created_at')
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    if (prodRes.data) setProducers(prodRes.data as ProducerInfo[]);
    if (ordRes.data) setOrders(ordRes.data as ProducerOrder[]);
    setLoading(false);
  };

  const handleAction = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    const { data, error } = await supabase.rpc('update_agro_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
    });
    const result = data as unknown as { success: boolean; message?: string } | null;
    if (error || !result?.success) {
      toast.error(result?.message || 'Erro ao atualizar');
    } else {
      toast.success(`Pedido ${statusConfig[newStatus]?.label || newStatus}`);
      fetchData();
    }
    setUpdatingId(null);
  };

  const totalVendido = orders.filter(o => o.status === 'entregue').reduce((s, o) => s + o.total, 0);
  const pendentes = orders.filter(o => ['pendente', 'confirmado', 'em_transporte'].includes(o.status)).length;

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Warehouse className="w-6 h-6 text-primary" />
          Painel do Produtor
        </h1>
        <p className="text-sm text-muted-foreground">Visão geral da sua produção e pedidos recebidos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{producers.length}</p>
            <p className="text-xs text-muted-foreground">Produtores Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pendentes}</p>
            <p className="text-xs text-muted-foreground">Pedidos Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{orders.length}</p>
            <p className="text-xs text-muted-foreground">Total Pedidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{totalVendido.toFixed(0)} MT</p>
            <p className="text-xs text-muted-foreground">Receita Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Producers summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Seus Produtores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {producers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum produtor ativo</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {producers.map(p => (
                <div key={p.id} className="border rounded-lg p-3 space-y-1">
                  <p className="font-semibold text-sm text-foreground">{p.nome_granja}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p.tipo_produto}</p>
                  <div className="flex justify-between text-xs">
                    <span>Estoque: <strong>{p.quantidade_disponivel}</strong></span>
                    <span>Preço: <strong>{p.preco.toFixed(2)} MT</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Pedidos Recebidos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum pedido recebido ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => {
                    const sc = statusConfig[order.status] || statusConfig.pendente;
                    const isTerminal = order.status === 'entregue' || order.status === 'cancelado';
                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <p className="text-sm font-medium text-foreground">{order.cliente_nome}</p>
                          <p className="text-xs text-muted-foreground">{order.cliente_contacto}</p>
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
                            {order.status === 'pendente' && (
                              <>
                                <Button size="sm" variant="outline" disabled={updatingId === order.id}
                                  onClick={() => handleAction(order.id, 'confirmado')}>
                                  {updatingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmar'}
                                </Button>
                                <Button size="sm" variant="destructive" disabled={updatingId === order.id}
                                  onClick={() => handleAction(order.id, 'cancelado')}>
                                  Rejeitar
                                </Button>
                              </>
                            )}
                            {order.status === 'confirmado' && (
                              <Button size="sm" variant="outline" disabled={updatingId === order.id}
                                onClick={() => handleAction(order.id, 'em_transporte')}>
                                {updatingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Enviar'}
                              </Button>
                            )}
                            {order.status === 'em_transporte' && (
                              <Button size="sm" variant="outline" disabled={updatingId === order.id}
                                onClick={() => handleAction(order.id, 'entregue')}>
                                {updatingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Entregue'}
                              </Button>
                            )}
                            {order.cliente_contacto && (
                              <Button size="sm" variant="ghost" className="text-green-600" asChild>
                                <a
                                  href={`https://wa.me/${order.cliente_contacto.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${order.cliente_nome}, o seu pedido de ${order.quantidade} unidades (${order.total.toFixed(2)} MT) está ${sc.label}. Obrigado!`)}`}
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

export default ProducerDashboardPage;
