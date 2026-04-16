import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gift, Users, Copy, Send, CheckCircle, Clock, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface Referral {
  id: string;
  invited_email: string;
  status: string;
  reward_days: number;
  reward_applied: boolean;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  signed_up: { label: 'Registado', color: 'bg-blue-100 text-blue-800' },
  converted: { label: 'Convertido', color: 'bg-green-100 text-green-800' },
};

const ReferralPage: React.FC = () => {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const referralLink = `${window.location.origin}/registrar?ref=${user?.id?.slice(0, 8) || ''}`;

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('referrals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setReferrals(data as unknown as Referral[]); });
  }, [user?.id]);

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Link copiado!');
  };

  const sendInvite = async () => {
    if (!email.trim() || !user?.id) return;
    setLoading(true);
    const { error } = await supabase.from('referrals').insert({
      user_id: user.id,
      invited_email: email.trim(),
    });
    if (error) { toast.error('Erro ao enviar convite'); }
    else {
      toast.success('Convite registado!');
      setEmail('');
      const { data } = await supabase.from('referrals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setReferrals(data as unknown as Referral[]);
    }
    setLoading(false);
  };

  const stats = {
    total: referrals.length,
    converted: referrals.filter(r => r.status === 'converted').length,
    rewardDays: referrals.filter(r => r.reward_applied).reduce((sum, r) => sum + r.reward_days, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Programa de Indicação</h1>
        <p className="text-sm text-muted-foreground">Convide amigos e ganhe dias grátis</p>
      </div>

      {/* Reward banner */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Gift className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Ganhe 7 dias grátis por indicação</h3>
            <p className="text-sm text-muted-foreground">Cada amigo que se registar e ativar o sistema garante 7 dias extras no seu plano.</p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <UserPlus className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Convites</p>
        </Card>
        <Card className="p-4 text-center">
          <CheckCircle className="w-5 h-5 text-[hsl(var(--success))] mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.converted}</p>
          <p className="text-xs text-muted-foreground">Convertidos</p>
        </Card>
        <Card className="p-4 text-center">
          <Gift className="w-5 h-5 text-[hsl(var(--warning))] mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.rewardDays}</p>
          <p className="text-xs text-muted-foreground">Dias Ganhos</p>
        </Card>
      </div>

      {/* Share link */}
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Seu Link de Indicação</h3>
        <div className="flex gap-2">
          <Input value={referralLink} readOnly className="text-sm" />
          <Button variant="outline" onClick={copyLink} className="gap-1 flex-shrink-0"><Copy className="w-4 h-4" /> Copiar</Button>
        </div>
      </Card>

      {/* Invite by email */}
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Convidar por Email</h3>
        <div className="flex gap-2">
          <Input type="email" placeholder="email@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
          <Button onClick={sendInvite} disabled={loading || !email.trim()} className="gap-1 flex-shrink-0"><Send className="w-4 h-4" /> Enviar</Button>
        </div>
      </Card>

      {/* Referral list */}
      {referrals.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-3">Histórico de Indicações</h3>
          <div className="space-y-2">
            {referrals.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.invited_email}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('pt-MZ')}</p>
                </div>
                <Badge className={`text-xs ${STATUS_LABELS[r.status]?.color || ''}`}>
                  {STATUS_LABELS[r.status]?.label || r.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ReferralPage;
