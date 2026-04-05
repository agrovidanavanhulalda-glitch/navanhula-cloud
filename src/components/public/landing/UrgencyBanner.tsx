import React, { useEffect, useState } from 'react';
import { Clock, Flame } from 'lucide-react';

const UrgencyBanner: React.FC = () => {
  const [hours, setHours] = useState(23);
  const [mins, setMins] = useState(59);
  const [secs, setSecs] = useState(59);

  useEffect(() => {
    // Calculate time remaining until midnight
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      setHours(Math.floor(diff / 3600000));
      setMins(Math.floor((diff % 3600000) / 60000));
      setSecs(Math.floor((diff % 60000) / 1000));
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="border-b border-primary/20 bg-primary/5">
      <div className="container flex flex-wrap items-center justify-center gap-3 py-2.5 text-sm">
        <Flame className="h-4 w-4 text-primary" />
        <span className="font-semibold">Oferta por tempo limitado</span>
        <span className="text-muted-foreground">—</span>
        <div className="flex items-center gap-1.5 font-mono font-bold text-primary">
          <Clock className="h-3.5 w-3.5" />
          {pad(hours)}:{pad(mins)}:{pad(secs)}
        </div>
        <span className="text-muted-foreground">restantes para configuração grátis</span>
      </div>
    </div>
  );
};

export default UrgencyBanner;
