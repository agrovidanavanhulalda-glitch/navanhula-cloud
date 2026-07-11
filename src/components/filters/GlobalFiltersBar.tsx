import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGlobalFilters, PeriodKey } from '@/contexts/GlobalFiltersContext';
import { Calendar, RotateCcw } from 'lucide-react';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
  { key: '365d', label: '1 ano' },
  { key: 'all', label: 'Tudo' },
];

const toInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

interface Props {
  showSeller?: boolean;
  showStage?: boolean;
  sellers?: { id: string; name: string }[];
  stages?: { key: string; label: string }[];
}

export const GlobalFiltersBar: React.FC<Props> = ({
  showSeller, showStage, sellers = [], stages = [],
}) => {
  const { filters, setPeriod, setRange, setSeller, setStage, reset, range } = useGlobalFilters();

  return (
    <Card className="p-3 flex flex-wrap items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <div className="flex flex-wrap gap-1">
        {PERIODS.map(p => (
          <Button
            key={p.key}
            size="sm"
            variant={filters.period === p.key ? 'default' : 'outline'}
            className="h-7 px-2 text-xs"
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <Input
          type="date"
          className="h-7 w-[140px] text-xs"
          value={toInput(range.from)}
          onChange={(e) => setRange(e.target.value ? new Date(e.target.value) : null, range.to)}
        />
        <span className="text-xs text-muted-foreground">→</span>
        <Input
          type="date"
          className="h-7 w-[140px] text-xs"
          value={toInput(range.to)}
          onChange={(e) => setRange(range.from, e.target.value ? new Date(e.target.value) : null)}
        />
      </div>

      {showSeller && sellers.length > 0 && (
        <select
          value={filters.seller}
          onChange={(e) => setSeller(e.target.value)}
          className="h-7 rounded-md border bg-background px-2 text-xs"
        >
          <option value="all">Todos os vendedores</option>
          {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {showStage && stages.length > 0 && (
        <select
          value={filters.stage}
          onChange={(e) => setStage(e.target.value)}
          className="h-7 rounded-md border bg-background px-2 text-xs"
        >
          <option value="all">Todas as etapas</option>
          {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      )}

      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs ml-auto" onClick={reset}>
        <RotateCcw className="h-3 w-3 mr-1" /> Limpar
      </Button>
    </Card>
  );
};

export default GlobalFiltersBar;
