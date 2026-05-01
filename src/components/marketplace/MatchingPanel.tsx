import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Zap, Star, RefreshCw } from 'lucide-react';

interface Order {
  id: string;
  comprador_id: string;
  quantidade: number;
  tipo_producao: string;
  peso_desejado: number;
  preco_oferecido: number;
  data_entrega: string | null;
  status: string;
  compradores?: { nome: string } | null;
}

interface Match {
  id: string;
  criador_id: string;
  score: number;
  status: string;
  criadores?: { nome: string; capacidade: number; preco_medio: number; provincia: string; confiabilidade: number } | null;
}

const MatchingPanel: React.FC = () => {
  const { company } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [matches, setMatches] = useState<Record<string, Match[]>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const loadOrders = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('pedidos_marketplace')
      .select('*, compradores(nome)')
      .eq('company_id', company.id)
      .in('status', ['aberto', 'em negociação'])
      .order('created_at', { ascending: false }) as any;
    setOrders(data || []);
    setLoading(false);
  };

  const loadMatches = async (orderId: string) => {
    const { data } = await supabase
      .from('marketplace_matches')
      .select('*, criadores(nome, capacidade, preco_medio, provincia, confiabilidade)')
      .eq('pedido_id', orderId)
      .order('score', { ascending: false }) as any;
    setMatches(prev => ({ ...prev, [orderId]: data || [] }));
  };

  useEffect(() => { loadOrders(); }, [company?.id]);

  const generateMatches = async (order: Order) => {
    if (!company?.id) return;
    setGenerating(order.id);
    try {
      // Fetch compatible breeders
      const { data: criadores } = await supabase
        .from('criadores')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'ativo') as any;

      if (!criadores?.length) {
        toast.info('Nenhum criador ativo encontrado');
        return;
      }

      // Calculate scores
      const scored = criadores
        .filter((c: any) => {
          if (order.tipo_producao && c.tipo_producao && c.tipo_producao !== order.tipo_producao && c.tipo_producao !== 'misto') return false;
          return true;
        })
        .map((c: any) => {
          let score = 0;
          // Capacity match (max 30)
          if ((c.capacidade || 0) >= order.quantidade) score += 30;
          else if ((c.capacidade || 0) >= order.quantidade * 0.5) score += 15;
          // Price match (max 25)
          if (order.preco_oferecido > 0 && c.preco_medio > 0) {
            const diff = Math.abs(order.preco_oferecido - c.preco_medio) / order.preco_oferecido;
            if (diff <= 0.1) score += 25;
            else if (diff <= 0.25) score += 15;
            else score += 5;
          }
          // Weight match (max 20)
          if (order.peso_desejado > 0 && c.peso_medio > 0) {
            const diff = Math.abs(order.peso_desejado - c.peso_medio) / order.peso_desejado;
            if (diff <= 0.1) score += 20;
            else if (diff <= 0.25) score += 10;
          }
          // Reliability (max 25)
          score += (c.confiabilidade || 3) * 5;
          return { criador_id: c.id, comprador_id: order.comprador_id || (order as any).compradores?.id, score: Math.min(score, 100) };
        })
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 10);

      // Delete old suggestions for this order
      await supabase.from('marketplace_matches').delete().eq('pedido_id', order.id).eq('status', 'sugerido');

      // Insert new matches
      if (scored.length) {
        const rows = scored.map((s: any) => ({
          company_id: company.id,
          criador_id: s.criador_id,
          comprador_id: s.comprador_id,
          pedido_id: order.id,
          score: s.score,
          status: 'sugerido',
        }));
        await supabase.from('marketplace_matches').insert(rows as any);
      }

      toast.success(`${scored.length} matches encontrados!`);
      await loadMatches(order.id);
      setSelectedOrder(order.id);
    } catch (e: any) {
      toast.error(e.message || 'Erro no matching');
    } finally {
      setGenerating(null);
    }
  };

  const updateMatchStatus = async (matchId: string, status: string, orderId: string) => {
    await supabase.from('marketplace_matches').update({ status } as any).eq('id', matchId);
    if (status === 'aceito') {
      await supabase.from('pedidos_marketplace').update({ status: 'em negociação' } as any).eq('id', orderId);
      toast.success('Match aceito! Pedido em negociação.');
    } else {
      toast.info('Match rejeitado.');
    }
    await loadMatches(orderId);
    await loadOrders();
  };

  const statusColor: Record<string, string> = {
    aberto: 'bg-blue-500/10 text-blue-700',
    'em negociação': 'bg-yellow-500/10 text-yellow-700',
    fechado: 'bg-green-500/10 text-green-700',
    cancelado: 'bg-red-500/10 text-red-700',
  };

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Pedidos Ativos</CardTitle></CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum pedido aberto</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comprador</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Peso</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(o => (
                    <TableRow key={o.id} className={selectedOrder === o.id ? 'bg-accent/50' : ''}>
                      <TableCell className="font-medium">{(o as any).compradores?.nome || '—'}</TableCell>
                      <TableCell>{o.quantidade}</TableCell>
                      <TableCell className="capitalize">{o.tipo_producao}</TableCell>
                      <TableCell>{o.peso_desejado} kg</TableCell>
                      <TableCell>{o.preco_oferecido?.toFixed(0)} MT</TableCell>
                      <TableCell>{o.data_entrega || '—'}</TableCell>
                      <TableCell><Badge className={statusColor[o.status]}>{o.status}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" disabled={generating === o.id}
                          onClick={() => generateMatches(o)}>
                          {generating === o.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                          <span className="ml-1">Match</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedOrder && matches[selectedOrder]?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Criadores Sugeridos</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Criador</TableHead>
                  <TableHead>Capacidade</TableHead>
                  <TableHead>Preço Médio</TableHead>
                  <TableHead>Província</TableHead>
                  <TableHead>Confiab.</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches[selectedOrder].map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.criadores?.nome || '—'}</TableCell>
                    <TableCell>{m.criadores?.capacidade || 0}</TableCell>
                    <TableCell>{m.criadores?.preco_medio?.toFixed(0) || 0} MT</TableCell>
                    <TableCell>{m.criadores?.provincia || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        {m.criadores?.confiabilidade || 3}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.score >= 70 ? 'default' : m.score >= 40 ? 'secondary' : 'outline'}>
                        {m.score}%
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline">{m.status}</Badge></TableCell>
                    <TableCell className="flex gap-1">
                      {m.status === 'sugerido' && (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600"
                            onClick={() => updateMatchStatus(m.id, 'aceito', selectedOrder)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600"
                            onClick={() => updateMatchStatus(m.id, 'rejeitado', selectedOrder)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MatchingPanel;
