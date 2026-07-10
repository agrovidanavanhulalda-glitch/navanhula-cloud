import React, { useEffect, useState } from 'react';
import { useSimulation } from '@/contexts/SimulationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, X, Clock, Building2, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const formatDuration = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export const SimulationBanner: React.FC = () => {
  const { session, isActive, endSimulation, loading } = useSimulation();
  const { user } = useAuth();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isActive]);

  if (!isActive || !session) return null;

  const elapsed = now - new Date(session.started_at).getTime();
  const remaining = session.expires_at ? new Date(session.expires_at).getTime() - now : null;

  return (
    <div className="sticky top-0 z-[60] w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-black shadow-lg animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4" />
          <span className="uppercase tracking-wider">Modo Simulação</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1"><Shield className="h-3 w-3" />Founder: {user?.full_name || user?.email}</span>
          <span className="flex items-center gap-1"><User className="h-3 w-3" />Simulando: {session.target_name || session.target_email}</span>
          {session.company_name && (
            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{session.company_name}</span>
          )}
          {session.role && <span className="rounded bg-black/20 px-1.5 py-0.5">{session.role}</span>}
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(elapsed)}</span>
          {remaining !== null && remaining > 0 && (
            <span className="opacity-80">Expira em {formatDuration(remaining)}</span>
          )}
        </div>
        <Button
          size="sm"
          variant="destructive"
          className="h-7 px-2 text-xs"
          disabled={loading}
          onClick={() => endSimulation()}
        >
          <X className="mr-1 h-3 w-3" /> Encerrar
        </Button>
      </div>
    </div>
  );
};

export default SimulationBanner;
