import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Radio } from 'lucide-react';

export type LiveSource = 'live' | 'degraded' | 'offline';

interface Props {
  source: LiveSource;
  fetchedAt?: string;
  className?: string;
}

const label: Record<LiveSource, string> = {
  live: 'LIVE',
  degraded: 'DEGRADED',
  offline: 'OFFLINE',
};

const tone: Record<LiveSource, string> = {
  live: 'border-primary/40 text-primary bg-primary/10',
  degraded: 'border-warning/40 text-warning bg-warning/10',
  offline: 'border-destructive/40 text-destructive bg-destructive/10',
};

export const LiveSourceBadge: React.FC<Props> = ({ source, fetchedAt, className }) => (
  <div className={`flex items-center gap-2 ${className ?? ''}`}>
    <Badge variant="outline" className={`${tone[source]} text-[10px] font-black`}>
      <Radio className="mr-1 h-3 w-3" /> {label[source]}
    </Badge>
    {fetchedAt && (
      <span className="text-[10px] text-muted-foreground">
        Atualizado {new Date(fetchedAt).toLocaleTimeString('pt-PT')}
      </span>
    )}
  </div>
);
export default LiveSourceBadge;
