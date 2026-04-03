import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const BuyerList: React.FC = () => {
  const { company } = useAuth();
  const [buyers, setBuyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!company?.id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('compradores')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      setBuyers(data || []);
      setLoading(false);
    };
    load();
  }, [company?.id]);

  const filtered = buyers.filter(b =>
    b.nome?.toLowerCase().includes(search.toLowerCase()) ||
    b.provincia?.toLowerCase().includes(search.toLowerCase())
  );

  const typeLabel: Record<string, string> = {
    mercado: 'Mercado',
    revendedor: 'Revendedor',
    hotel: 'Hotel/Rest.',
    supermercado: 'Supermercado',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Compradores Cadastrados</CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar comprador..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum comprador encontrado</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Província</TableHead>
                  <TableHead>Capacidade</TableHead>
                  <TableHead>Freq.</TableHead>
                  <TableHead>Preço Alvo</TableHead>
                  <TableHead>Confiab.</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.nome}</TableCell>
                    <TableCell>{typeLabel[b.tipo] || b.tipo}</TableCell>
                    <TableCell>{b.provincia || '—'}</TableCell>
                    <TableCell>{b.capacidade_compra}</TableCell>
                    <TableCell className="capitalize">{b.frequencia_compra}</TableCell>
                    <TableCell>{b.preco_alvo?.toFixed(0)} MT</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        {b.confiabilidade || 3}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={b.status === 'ativo' ? 'default' : 'secondary'}>
                        {b.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BuyerList;
