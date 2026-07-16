import React, { Suspense, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

const AgroMapViewLazy = React.lazy(() => import('./CriadoresMap'));

interface Props {
  criadores: any[];
}

const CriadoresMapView: React.FC<Props> = ({ criadores }) => {
  const [filterProv, setFilterProv] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');

  const provincias = [...new Set(criadores.map(c => c.provincia).filter(Boolean))];

  const filtered = useMemo(() => criadores.filter(c => {
    if (!c.latitude || !c.longitude) return false;
    if (filterProv !== 'all' && c.provincia !== filterProv) return false;
    if (filterTipo !== 'all' && c.tipo_producao !== filterTipo) return false;
    return true;
  }), [criadores, filterProv, filterTipo]);

  const center: [number, number] = filtered.length > 0
    ? [filtered[0].latitude, filtered[0].longitude]
    : [-15.12, 39.26];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Mapa de Criadores ({filtered.length})</CardTitle>
        <div className="flex flex-wrap gap-3 pt-2">
          <Select value={filterProv} onValueChange={setFilterProv}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Província" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {provincias.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="corte">Corte</SelectItem>
              <SelectItem value="postura">Postura</SelectItem>
              <SelectItem value="misto">Misto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] rounded-lg overflow-hidden border border-border">
          <ErrorBoundary>
            <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <AgroMapViewLazy criadores={filtered} center={center} />
            </Suspense>
          </ErrorBoundary>
        </div>
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-4">Nenhum criador com coordenadas GPS encontrado. Adicione latitude/longitude ao cadastrar.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default CriadoresMapView;
