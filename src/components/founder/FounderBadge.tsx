import React from 'react';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FounderBadgeProps {
  compact?: boolean;
  className?: string;
}

/**
 * FounderBadge — Gold badge shown permanently in the header for founders.
 * Displays: 👑 FOUNDER · MAX ENTERPRISE · LIFETIME
 */
export const FounderBadge: React.FC<FounderBadgeProps> = ({ compact, className }) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-bold tracking-wide',
        'bg-gradient-to-r from-gold/90 via-accent to-gold/90 text-accent-foreground',
        'shadow-[0_0_16px_hsl(var(--gold)/0.35)] border border-gold/60',
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        className,
      )}
      title="Fundador NAVANHULA CLOUD"
    >
      <Crown className={cn(compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      <span>FOUNDER</span>
      {!compact && (
        <>
          <span className="opacity-60">·</span>
          <span>MAX ENTERPRISE</span>
          <span className="opacity-60">·</span>
          <span>LIFETIME</span>
        </>
      )}
    </div>
  );
};

export default FounderBadge;
