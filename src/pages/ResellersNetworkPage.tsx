import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  BarChart3,
  Building2,
  Copy,
  FileText,
  Handshake,
  Link2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface Reseller {
  id: string;
  profile_id: string | null;
  full_name: string;
  phone: string;
  email: string;
  city: string | null;
  country: string;
  document_id: string | null;
  referral_code: string;
  status: 'active' | 'suspended';
  created_at: string;
}

interface ReferralSignup {
  id: string;
  reseller_id: string;
  referred_email: string | null;
  referred_user_id: string | null;
  company_id: string | null;
  status: 'captured' | 'converted';
  created_at: string;
}

interface ResellerClient {
  id: string;
  reseller_id: string;
  company_id: string;
  primary_contact_email: string | null;
  status: string;
  total_revenue: number;
  total_commission_generated: number;
  total_commission_paid: number;
  created_at: string;
}

interface ResellerCommission {
  id: string;
  reseller_id: string;
  company_id: string;
  payment_amount: number;
  commission_amount: number;
  commission_rate: number;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  paid_at: string | null;
}

interface ResellerPayout {
  id: string;
  reseller_id: string;
  amount: number;
  payment_method: string;
  status: 'pending' | 'paid';
  reference: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

interface ResellerMaterial {
  id: string;
  title: string;
  description: string | null;
  material_type: string;
  content_text: string | null;
  asset_url: string | null;
}

const payoutMethods = ['mpesa', 'emola', 'mkesh', 'transferencia'] as const;
const payoutMethodLabels: Record<(typeof payoutMethods)[number], string> = {
  mpesa: 'M-Pesa',
  emola: 'e-Mola',
  mkesh: 'mKesh',
  transferencia: 'Transferência bancária',
};

const formatDate = (value: string | null | undefined, withTime = false) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-MZ', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return 'Ativo';
    case 'suspended':
      return 'Suspenso';
    case 'converted':
      return 'Convertido';
    case 'captured':
      return 'Capturado';
    case 'paid':
      return 'Pago';
    case 'pending':
      return 'Pendente';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
};

const badgeVariant = (status: string): 'default' | 'secondary' => (
  ['active', 'converted', 'paid'].includes(status) ? 'default' : 'secondary'
);

const StatCard: React.FC<{ label: string; value: string | number; helper?: string }> = ({ label, value, helper }) => (
  <Card className="p-4 space-y-1">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold tracking-tight">{value}</p>
    {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
  </Card>
);

const EmptyBlock: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <Card className="p-6 text-sm text-muted-foreground">
    <p className="font-medium text-foreground">{title}</p>
    <p className="mt-1">{description}</p>
  </Card>
);

const ResellersNetworkPage: React.FC = () => {
  const location = useLocation();
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' || role === 'ceo';
  const isReseller = role === 'reseller';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resellerProfile, setResellerProfile] = useState<Reseller | null>(null);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [signups, setSignups] = useState<ReferralSignup[]>([]);
  const [clients, setClients] = useState<ResellerClient[]>([]);
  const [commissions, setCommissions] = useState<ResellerCommission[]>([]);
  const [payouts, setPayouts] = useState<ResellerPayout[]>([]);
  const [materials, setMaterials] = useState<ResellerMaterial[]>([]);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    city: '',
    country: 'Moçambique',
    document_id: '',
  });
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ reseller_id: '', payment_method: 'mpesa', reference: '', notes: '' });

  const currentView = useMemo(() => {
    const last = location.pathname.split('/').filter(Boolean).pop();
    return last || 'dashboard';
  }, [location.pathname]);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      if (isReseller) {
        const [myResellerRes, materialsRes] = await Promise.all([
          supabase.from('resellers').select('*').eq('profile_id', user.id).maybeSingle(),
          supabase.from('reseller_materials').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        ]);

        const myReseller = (myResellerRes.data as Reseller | null) || null;
        setMaterials((materialsRes.data as ResellerMaterial[]) || []);
        setResellerProfile(myReseller);

        if (!myReseller) {
          setResellers([]);
          setSignups([]);
          setClients([]);
          setCommissions([]);
          setPayouts([]);
          return;
        }

        const resellerId = myReseller.id;
        const [signupsRes, clientsRes, commissionsRes, payoutsRes] = await Promise.all([
          supabase.from('referral_signups').select('*').eq('reseller_id', resellerId).order('created_at', { ascending: false }),
          supabase.from('reseller_clients').select('*').eq('reseller_id', resellerId).order('created_at', { ascending: false }),
          supabase.from('reseller_commissions').select('*').eq('reseller_id', resellerId).order('created_at', { ascending: false }),
          supabase.from('reseller_payouts').select('*').eq('reseller_id', resellerId).order('created_at', { ascending: false }),
        ]);

        setResellers([myReseller]);
        setSignups((signupsRes.data as ReferralSignup[]) || []);
        setClients((clientsRes.data as ResellerClient[]) || []);
        setCommissions((commissionsRes.data as ResellerCommission[]) || []);
        setPayouts((payoutsRes.data as ResellerPayout[]) || []);
      } else {
        const [resellersRes, signupsRes, clientsRes, commissionsRes, payoutsRes, materialsRes] = await Promise.all([
          supabase.from('resellers').select('*').order('created_at', { ascending: false }),
          supabase.from('referral_signups').select('*').order('created_at', { ascending: false }),
          supabase.from('reseller_clients').select('*').order('created_at', { ascending: false }),
          supabase.from('reseller_commissions').select('*').order('created_at', { ascending: false }),
          supabase.from('reseller_payouts').select('*').order('created_at', { ascending: false }),
          supabase.from('reseller_materials').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        ]);

        setResellerProfile(null);
        setResellers((resellersRes.data as Reseller[]) || []);
        setSignups((signupsRes.data as ReferralSignup[]) || []);
        setClients((clientsRes.data as ResellerClient[]) || []);
        setCommissions((commissionsRes.data as ResellerCommission[]) || []);
        setPayouts((payoutsRes.data as ResellerPayout[]) || []);
        setMaterials((materialsRes.data as ResellerMaterial[]) || []);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar rede de revendedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, role]);

  const refreshData = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateReseller = async () => {
    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      city: form.city.trim() || null,
      country: form.country.trim() || 'Moçambique',
      document_id: form.document_id.trim() || null,
    };

    if (!payload.full_name || !payload.phone || !payload.email) {
      toast.error('Preencha nome, telefone e email');
      return;
    }

    if (payload.full_name.length > 120 || payload.email.length > 255 || payload.phone.length > 30) {
      toast.error('Alguns campos excedem o limite permitido');
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from('resellers').insert(payload);
      if (error) throw error;
      toast.success('Revendedor cadastrado com sucesso');
      setForm({ full_name: '', phone: '', email: '', city: '', country: 'Moçambique', document_id: '' });
      await refreshData();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao cadastrar revendedor');
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (item: Reseller) => {
    try {
      const nextStatus = item.status === 'active' ? 'suspended' : 'active';
      const { error } = await supabase.from('resellers').update({ status: nextStatus }).eq('id', item.id);
      if (error) throw error;
      toast.success(`Revendedor ${nextStatus === 'active' ? 'ativado' : 'suspenso'}`);
      await refreshData();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar status');
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link copiado');
    } catch {
      toast.error('Não foi possível copiar o link');
    }
  };

  const resellerDirectory = useMemo(
    () => new Map(resellers.map((item) => [item.id, item])),
    [resellers]
  );

  const activeResellerId = resellerProfile?.id || payoutForm.reseller_id;
  const pendingAmount = useMemo(() => {
    if (!activeResellerId) return 0;
    return commissions
      .filter((item) => item.reseller_id === activeResellerId && item.status === 'pending')
      .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);
  }, [commissions, activeResellerId]);

  const summary = useMemo(() => ({
    totalResellers: resellers.length,
    activeResellers: resellers.filter((item) => item.status === 'active').length,
    totalSignups: signups.length,
    totalConverted: signups.filter((item) => item.status === 'converted').length,
    totalClients: clients.length,
    totalRevenue: clients.reduce((sum, item) => sum + Number(item.total_revenue || 0), 0),
    totalCommissions: commissions.reduce((sum, item) => sum + Number(item.commission_amount || 0), 0),
    totalPaid: payouts.reduce((sum, item) => sum + Number(item.amount || 0), 0),
  }), [clients, commissions, payouts, resellers, signups]);

  const performance = useMemo(() => (
    resellers
      .map((item) => {
        const resellerClients = clients.filter((client) => client.reseller_id === item.id);
        const resellerCommissions = commissions.filter((commission) => commission.reseller_id === item.id);
        const resellerPayouts = payouts.filter((payout) => payout.reseller_id === item.id);

        return {
          ...item,
          clients: resellerClients.length,
          revenue: resellerClients.reduce((sum, client) => sum + Number(client.total_revenue || 0), 0),
          commissions: resellerCommissions.reduce((sum, commission) => sum + Number(commission.commission_amount || 0), 0),
          paid: resellerPayouts.reduce((sum, payout) => sum + Number(payout.amount || 0), 0),
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
  ), [clients, commissions, payouts, resellers]);

  const titleMap: Record<string, string> = {
    dashboard: isReseller ? 'Painel do Revendedor' : 'Dashboard de Revendedores',
    cadastrar: 'Cadastrar Revendedor',
    lista: isReseller ? 'Clientes Indicados' : 'Lista de Revendedores',
    comissoes: 'Comissões',
    pagamentos: 'Pagamentos',
    links: 'Links de Convite',
    performance: 'Relatórios de Performance',
    materiais: 'Materiais de Venda',
  };

  const descriptionMap: Record<string, string> = {
    dashboard: isReseller
      ? 'Acompanhe clientes indicados, comissões geradas e saldo disponível para saque.'
      : 'Gerencie a rede comercial com visibilidade sobre captação, conversão e pagamentos.' ,
    cadastrar: 'Crie novos agentes comerciais com link exclusivo de indicação.',
    lista: isReseller ? 'Veja as empresas captadas pelo seu link exclusivo.' : 'Controle cadastros, status e links individuais de cada revendedor.',
    comissoes: 'Acompanhe o valor gerado automaticamente por cada assinatura paga.',
    pagamentos: 'Registre saques e acompanhe histórico de pagamentos de comissões.',
    links: 'Copie e partilhe links exclusivos para rastrear cada nova indicação.',
    performance: 'Compare resultados, receita gerada e ranking de revendedores.',
    materiais: 'Central de apoio com conteúdos comerciais para acelerar as vendas.',
  };

  const inviteLink = (code: string) => `${window.location.origin}/registrar?ref=${code}`;

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando módulo de revendedores...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{titleMap[currentView] || 'Rede de Revendedores'}</h1>
          <p className="text-muted-foreground">{descriptionMap[currentView] || 'Rede comercial com indicação, comissão automática e controlo de pagamentos.'}</p>
        </div>
        <Button variant="outline" onClick={refreshData} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {currentView === 'dashboard' && (
        <>
          {isReseller ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Clientes indicados" value={clients.length} />
              <StatCard label="Comissões geradas" value={formatCurrency(summary.totalCommissions)} />
              <StatCard label="Comissões pagas" value={formatCurrency(summary.totalPaid)} />
              <StatCard label="Saldo disponível" value={formatCurrency(commissions.filter((item) => item.status === 'pending').reduce((sum, item) => sum + Number(item.commission_amount || 0), 0))} />
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
              <StatCard label="Revendedores" value={summary.totalResellers} helper={`${summary.activeResellers} ativos`} />
              <StatCard label="Leads capturados" value={summary.totalSignups} helper={`${summary.totalConverted} convertidos`} />
              <StatCard label="Clientes indicados" value={summary.totalClients} />
              <StatCard label="Comissões geradas" value={formatCurrency(summary.totalCommissions)} />
              <StatCard label="Comissões pagas" value={formatCurrency(summary.totalPaid)} />
            </div>
          )}

          {isReseller && !resellerProfile ? (
            <EmptyBlock
              title="Perfil de revendedor em preparação"
              description="Seu acesso já está ativo, mas seu cadastro comercial ainda não foi vinculado. Assim que o administrador concluir, seu link e comissões aparecerão aqui."
            />
          ) : null}

          {resellerProfile ? (
            <Card className="p-5 space-y-4 border-primary/20 bg-card">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Seu link de indicação</p>
                  <p className="font-semibold break-all">{inviteLink(resellerProfile.referral_code)}</p>
                </div>
                <Button onClick={() => copyText(inviteLink(resellerProfile.referral_code))}>
                  <Copy className="w-4 h-4 mr-2" /> Copiar link
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Código exclusivo</p>
                  <p className="text-xl font-bold">{resellerProfile.referral_code}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={badgeVariant(resellerProfile.status)}>{statusLabel(resellerProfile.status)}</Badge>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Comissão padrão</p>
                  <p className="text-xl font-bold">30%</p>
                </Card>
              </div>
            </Card>
          ) : null}

          {!isReseller && (
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2 font-semibold">
                  <BarChart3 className="w-4 h-4 text-primary" /> Top revendedores
                </div>
                {performance.slice(0, 5).map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <div>
                      <p className="font-medium">#{index + 1} • {item.full_name}</p>
                      <p className="text-xs text-muted-foreground">{item.clients} clientes • {formatCurrency(item.revenue)} em receita</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.commissions)}</p>
                  </div>
                ))}
                {performance.length === 0 && <EmptyBlock title="Sem performance ainda" description="Cadastre revendedores e acompanhe as primeiras indicações convertidas." />}
              </Card>

              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Últimas indicações
                </div>
                {signups.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-lg border border-border p-3 space-y-1">
                    <p className="font-medium">{item.referred_email || 'Novo registo'}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at, true)}</p>
                    <Badge variant={badgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                  </div>
                ))}
                {signups.length === 0 && <EmptyBlock title="Nenhuma indicação ainda" description="Os registos vindos dos links exclusivos aparecerão aqui automaticamente." />}
              </Card>
            </div>
          )}

          {isReseller && (
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Leads recentes
                </div>
                {signups.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <div>
                      <p className="font-medium">{item.referred_email || 'Novo registo'}</p>
                      <p className="text-xs text-muted-foreground">Capturado em {formatDate(item.created_at, true)}</p>
                    </div>
                    <Badge variant={badgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                  </div>
                ))}
                {signups.length === 0 && <EmptyBlock title="Sem leads capturados" description="Partilhe seu link de indicação para começar a receber novos contactos." />}
              </Card>

              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2 font-semibold">
                  <TrendingUp className="w-4 h-4 text-primary" /> Últimas comissões
                </div>
                {commissions.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <div>
                      <p className="font-medium">{formatCurrency(item.commission_amount)}</p>
                      <p className="text-xs text-muted-foreground">{item.commission_rate}% sobre {formatCurrency(item.payment_amount)}</p>
                    </div>
                    <Badge variant={badgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                  </div>
                ))}
                {commissions.length === 0 && <EmptyBlock title="Sem comissões ainda" description="As comissões aparecem automaticamente quando um cliente indicado paga a assinatura." />}
              </Card>
            </div>
          )}
        </>
      )}

      {currentView === 'cadastrar' && (
        isAdmin ? (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="p-5 space-y-4 max-w-3xl">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome completo</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <Label>País</Label>
                  <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
                <div>
                  <Label>Documento (opcional)</Label>
                  <Input value={form.document_id} onChange={(e) => setForm({ ...form, document_id: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleCreateReseller} disabled={creating}>
                <UserPlus className="w-4 h-4 mr-2" /> {creating ? 'Cadastrando...' : 'Cadastrar revendedor'}
              </Button>
            </Card>

            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 font-semibold">
                <Handshake className="w-4 h-4 text-primary" /> O que acontece após o cadastro
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>• O sistema gera automaticamente um ID e um link exclusivo de indicação.</p>
                <p>• Quando o revendedor criar conta com o mesmo email, o perfil é ligado automaticamente.</p>
                <p>• Cada nova assinatura paga gera 30% de comissão para o agente responsável.</p>
                <p>• O histórico fica auditado para evitar duplicação e fraude de indicação.</p>
              </div>
            </Card>
          </div>
        ) : (
          <EmptyBlock title="Acesso restrito" description="Somente administradores podem cadastrar novos revendedores." />
        )
      )}

      {currentView === 'lista' && (
        isReseller ? (
          <div className="space-y-3">
            {clients.map((item) => (
              <Card key={item.id} className="p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <p className="font-semibold">{item.primary_contact_email || 'Cliente indicado'}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Vinculado em {formatDate(item.created_at)}</p>
                  <Badge variant={badgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 md:min-w-[320px]">
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground">Receita gerada</p>
                    <p className="font-semibold">{formatCurrency(item.total_revenue)}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground">Comissão total</p>
                    <p className="font-semibold">{formatCurrency(item.total_commission_generated)}</p>
                  </Card>
                </div>
              </Card>
            ))}
            {clients.length === 0 && <EmptyBlock title="Sem clientes indicados" description="Quando uma empresa concluir o registo pelo seu link, ela aparecerá aqui automaticamente." />}
          </div>
        ) : (
          <div className="space-y-3">
            {resellers.map((item) => {
              const resellerClients = clients.filter((client) => client.reseller_id === item.id);
              const resellerGenerated = commissions
                .filter((commission) => commission.reseller_id === item.id)
                .reduce((sum, commission) => sum + Number(commission.commission_amount || 0), 0);

              return (
                <Card key={item.id} className="p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold">{item.full_name}</p>
                    <p className="text-sm text-muted-foreground">{item.email} • {item.phone}</p>
                    <p className="text-xs text-muted-foreground">{item.city || 'Sem cidade'} • {item.country} • {item.referral_code}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Card className="p-3 min-w-[140px]">
                      <p className="text-xs text-muted-foreground">Clientes</p>
                      <p className="font-semibold">{resellerClients.length}</p>
                    </Card>
                    <Card className="p-3 min-w-[160px]">
                      <p className="text-xs text-muted-foreground">Comissões</p>
                      <p className="font-semibold">{formatCurrency(resellerGenerated)}</p>
                    </Card>
                    <Badge variant={badgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                    <Button variant="outline" onClick={() => copyText(inviteLink(item.referral_code))}>
                      <Copy className="w-4 h-4 mr-2" /> Link
                    </Button>
                    <Button variant="outline" onClick={() => toggleStatus(item)}>
                      {item.status === 'active' ? 'Suspender' : 'Ativar'}
                    </Button>
                  </div>
                </Card>
              );
            })}
            {resellers.length === 0 && <EmptyBlock title="Nenhum revendedor cadastrado" description="Cadastre o primeiro agente comercial para ativar a rede de indicação." />}
          </div>
        )
      )}

      {currentView === 'comissoes' && (
        <div className="space-y-3">
          {commissions.map((item) => {
            const resellerName = resellerDirectory.get(item.reseller_id)?.full_name;

            return (
              <Card key={item.id} className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{formatCurrency(item.commission_amount)}</p>
                  <p className="text-sm text-muted-foreground">{item.commission_rate}% sobre {formatCurrency(item.payment_amount)}</p>
                  {!isReseller && resellerName ? <p className="text-xs text-muted-foreground">Revendedor: {resellerName}</p> : null}
                  <p className="text-xs text-muted-foreground">Gerada em {formatDate(item.created_at, true)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {item.paid_at ? <p className="text-xs text-muted-foreground">Pago em {formatDate(item.paid_at, true)}</p> : null}
                  <Badge variant={badgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                </div>
              </Card>
            );
          })}
          {commissions.length === 0 && <EmptyBlock title="Nenhuma comissão registada" description="As comissões aparecerão automaticamente após os pagamentos dos clientes indicados." />}
        </div>
      )}

      {currentView === 'pagamentos' && (
        <div className="space-y-6">
          {isAdmin && (
            <Card className="p-5 space-y-4 max-w-3xl">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Revendedor</Label>
                  <Select value={payoutForm.reseller_id} onValueChange={(value) => setPayoutForm({ ...payoutForm, reseller_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar revendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {resellers.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Método de pagamento</Label>
                  <Select value={payoutForm.payment_method} onValueChange={(value) => setPayoutForm({ ...payoutForm, payment_method: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {payoutMethods.map((method) => (
                        <SelectItem key={method} value={method}>{payoutMethodLabels[method]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Referência</Label>
                  <Input value={payoutForm.reference} onChange={(e) => setPayoutForm({ ...payoutForm, reference: e.target.value })} />
                </div>
                <div>
                  <Label>Valor pendente</Label>
                  <Input value={formatCurrency(pendingAmount)} readOnly />
                </div>
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea value={payoutForm.notes} onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })} />
              </div>
              <Button
                onClick={async () => {
                  if (!payoutForm.reseller_id) {
                    toast.error('Selecione um revendedor');
                    return;
                  }

                  const pendingIds = commissions
                    .filter((item) => item.reseller_id === payoutForm.reseller_id && item.status === 'pending')
                    .map((item) => item.id);

                  if (pendingIds.length === 0 || pendingAmount <= 0) {
                    toast.error('Este revendedor não tem saldo pendente');
                    return;
                  }

                  setPaying(true);
                  try {
                    const paidAt = new Date().toISOString();
                    const { data: payout, error: payoutError } = await supabase
                      .from('reseller_payouts')
                      .insert({
                        reseller_id: payoutForm.reseller_id,
                        amount: pendingAmount,
                        payment_method: payoutForm.payment_method,
                        status: 'paid',
                        reference: payoutForm.reference.trim() || null,
                        notes: payoutForm.notes.trim() || null,
                        paid_at: paidAt,
                        created_by: user?.id || null,
                      })
                      .select('id')
                      .single();

                    if (payoutError) throw payoutError;

                    const payoutItems = pendingIds.map((commissionId) => ({
                      payout_id: payout.id,
                      commission_id: commissionId,
                    }));

                    const { error: itemsError } = await supabase.from('reseller_payout_items').insert(payoutItems);
                    if (itemsError) throw itemsError;

                    const { error: commissionsError } = await supabase
                      .from('reseller_commissions')
                      .update({ status: 'paid', paid_at: paidAt })
                      .in('id', pendingIds);
                    if (commissionsError) throw commissionsError;

                    toast.success('Pagamento de comissão registado');
                    setPayoutForm({ reseller_id: '', payment_method: 'mpesa', reference: '', notes: '' });
                    await refreshData();
                  } catch (error: any) {
                    toast.error(error?.message || 'Erro ao registrar pagamento');
                  } finally {
                    setPaying(false);
                  }
                }}
                disabled={paying || pendingAmount <= 0}
              >
                <Wallet className="w-4 h-4 mr-2" /> {paying ? 'Processando...' : 'Marcar pagamento como pago'}
              </Button>
            </Card>
          )}

          <div className="space-y-3">
            {payouts.map((item) => (
              <Card key={item.id} className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{formatCurrency(item.amount)}</p>
                  <p className="text-sm text-muted-foreground">{payoutMethodLabels[item.payment_method as keyof typeof payoutMethodLabels] || item.payment_method} • {item.reference || 'sem referência'}</p>
                  {!isReseller && resellerDirectory.get(item.reseller_id)?.full_name ? (
                    <p className="text-xs text-muted-foreground">Revendedor: {resellerDirectory.get(item.reseller_id)?.full_name}</p>
                  ) : null}
                  {item.notes ? <p className="text-xs text-muted-foreground">{item.notes}</p> : null}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground">{formatDate(item.paid_at || item.created_at, true)}</p>
                  <Badge variant={badgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                </div>
              </Card>
            ))}
            {payouts.length === 0 && <EmptyBlock title="Nenhum pagamento registado" description="Os pagamentos de comissão processados aparecerão aqui." />}
          </div>
        </div>
      )}

      {currentView === 'links' && (
        isReseller && resellerProfile ? (
          <Card className="p-5 space-y-4 max-w-4xl">
            <div className="flex items-center gap-2 font-semibold">
              <Link2 className="w-4 h-4 text-primary" /> Seu link de convite
            </div>
            <div className="rounded-lg border border-border p-4 break-all text-sm">{inviteLink(resellerProfile.referral_code)}</div>
            <div className="grid gap-3 md:grid-cols-3">
              <Card className="p-4"><p className="text-xs text-muted-foreground">Código</p><p className="font-semibold">{resellerProfile.referral_code}</p></Card>
              <Card className="p-4"><p className="text-xs text-muted-foreground">Leads capturados</p><p className="font-semibold">{signups.length}</p></Card>
              <Card className="p-4"><p className="text-xs text-muted-foreground">Clientes convertidos</p><p className="font-semibold">{signups.filter((item) => item.status === 'converted').length}</p></Card>
            </div>
            <Button onClick={() => copyText(inviteLink(resellerProfile.referral_code))}>
              <Copy className="w-4 h-4 mr-2" /> Copiar link
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {resellers.map((item) => (
              <Card key={item.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold">{item.full_name}</p>
                    <p className="text-sm text-muted-foreground">{item.referral_code}</p>
                  </div>
                  <Badge variant={badgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                </div>
                <div className="rounded-lg border border-border p-3 text-sm break-all">{inviteLink(item.referral_code)}</div>
                <Button variant="outline" onClick={() => copyText(inviteLink(item.referral_code))}>
                  <Link2 className="w-4 h-4 mr-2" /> Copiar link
                </Button>
              </Card>
            ))}
            {resellers.length === 0 && <EmptyBlock title="Sem links gerados" description="Cadastre um revendedor para o sistema criar automaticamente um link exclusivo." />}
          </div>
        )
      )}

      {currentView === 'performance' && (
        <div className="space-y-3">
          {performance.map((item, index) => (
            <Card key={item.id} className="p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">#{index + 1} • {item.full_name}</p>
                <p className="text-sm text-muted-foreground">{item.clients} clientes • {formatCurrency(item.revenue)} em receita</p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:min-w-[360px]">
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Comissões geradas</p>
                  <p className="font-semibold">{formatCurrency(item.commissions)}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Comissões pagas</p>
                  <p className="font-semibold">{formatCurrency(item.paid)}</p>
                </Card>
              </div>
            </Card>
          ))}
          {performance.length === 0 && <EmptyBlock title="Sem dados de performance" description="A performance será calculada automaticamente após as primeiras conversões." />}
        </div>
      )}

      {currentView === 'materiais' && (
        <div className="grid gap-4 md:grid-cols-2">
          {materials.map((item) => (
            <Card key={item.id} className="p-5 space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <FileText className="w-4 h-4 text-primary" /> {item.title}
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <Badge variant="secondary">{item.material_type}</Badge>
              {item.content_text ? <p className="text-sm leading-6">{item.content_text}</p> : null}
              {item.asset_url ? (
                <a className="text-sm text-primary underline" href={item.asset_url} target="_blank" rel="noreferrer">
                  Abrir material
                </a>
              ) : null}
            </Card>
          ))}
          {materials.length === 0 && <EmptyBlock title="Nenhum material disponível" description="Adicione apresentações, vídeos e textos de venda para apoiar a rede comercial." />}
        </div>
      )}
    </div>
  );
};

export default ResellersNetworkPage;

