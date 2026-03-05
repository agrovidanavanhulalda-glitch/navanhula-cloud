import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Link2,
  Wallet,
  BarChart3,
  Copy,
  TrendingUp,
  ShieldCheck,
  Clock3,
  CheckCircle2,
  RefreshCw,
  FileText,
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
  total_revenue: number;
  total_commission_generated: number;
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

const payoutMethods = ['mpesa', 'emola', 'mkesh', 'transferencia'];

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

  const activeResellerId = resellerProfile?.id || payoutForm.reseller_id;

  const inviteLink = (code: string) => `${window.location.origin}/registrar?ref=${code}`;

  const pendingAmount = useMemo(() => {
    if (!activeResellerId) return 0;
    return commissions
      .filter((item) => item.reseller_id === activeResellerId && item.status === 'pending')
      .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);
  }, [commissions, activeResellerId]);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      if (isReseller) {
        const { data: myReseller } = await supabase
          .from('resellers')
          .select('*')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (myReseller) {
          setResellerProfile(myReseller as Reseller);
          const resellerId = myReseller.id;
          const [signupsRes, clientsRes, commissionsRes, payoutsRes, materialsRes, resellersRes] = await Promise.all([
            supabase.from('referral_signups').select('*').eq('reseller_id', resellerId).order('created_at', { ascending: false }),
            supabase.from('reseller_clients').select('*').eq('reseller_id', resellerId).order('created_at', { ascending: false }),
            supabase.from('reseller_commissions').select('*').eq('reseller_id', resellerId).order('created_at', { ascending: false }),
            supabase.from('reseller_payouts').select('*').eq('reseller_id', resellerId).order('created_at', { ascending: false }),
            supabase.from('reseller_materials').select('*').eq('is_active', true).order('created_at', { ascending: false }),
            supabase.from('resellers').select('*').eq('id', resellerId),
          ]);

          setResellers((resellersRes.data as Reseller[]) || []);
          setSignups((signupsRes.data as ReferralSignup[]) || []);
          setClients((clientsRes.data as ResellerClient[]) || []);
          setCommissions((commissionsRes.data as ResellerCommission[]) || []);
          setPayouts((payoutsRes.data as ResellerPayout[]) || []);
          setMaterials((materialsRes.data as ResellerMaterial[]) || []);
        }
      } else {
        const [resellersRes, signupsRes, clientsRes, commissionsRes, payoutsRes, materialsRes] = await Promise.all([
          supabase.from('resellers').select('*').order('created_at', { ascending: false }),
          supabase.from('referral_signups').select('*').order('created_at', { ascending: false }),
          supabase.from('reseller_clients').select('*').order('created_at', { ascending: false }),
          supabase.from('reseller_commissions').select('*').order('created_at', { ascending: false }),
          supabase.from('reseller_payouts').select('*').order('created_at', { ascending: false }),
          supabase.from('reseller_materials').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        ]);

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

  const handleCreatePayout = async () => {
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
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link copiado');
    } catch {
      toast.error('Não foi possível copiar o link');
    }
  };

  const summary = {
    totalResellers: resellers.length,
    activeResellers: resellers.filter((item) => item.status === 'active').length,
    totalClients: clients.length,
    totalRevenue: clients.reduce((sum, item) => sum + Number(item.total_revenue || 0), 0),
    totalCommissions: commissions.reduce((sum, item) => sum + Number(item.commission_amount || 0), 0),
    totalPaid: payouts.reduce((sum, item) => sum + Number(item.amount || 0), 0),
  };

  const performance = [...resellers]
    .map((item) => ({
      ...item,
      clients: clients.filter((client) => client.reseller_id === item.id).length,
      revenue: clients
        .filter((client) => client.reseller_id === item.id)
        .reduce((sum, client) => sum + Number(client.total_revenue || 0), 0),
      commissions: commissions
        .filter((commission) => commission.reseller_id === item.id)
        .reduce((sum, commission) => sum + Number(commission.commission_amount || 0), 0),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const titleMap: Record<string, string> = {
    dashboard: isReseller ? 'Painel do Revendedor' : 'Dashboard de Revendedores',
    cadastrar: 'Cadastrar Revendedor',
    lista: 'Lista de Revendedores',
    comissoes: 'Comissões',
    pagamentos: 'Pagamentos',
    links: 'Links de Convite',
    performance: 'Relatórios de Performance',
    materiais: 'Materiais de Venda',
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando módulo de revendedores...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{titleMap[currentView] || 'Rede de Revendedores'}</h1>
          <p className="text-muted-foreground">Rede comercial com indicação, comissão automática e controlo de pagamentos.</p>
        </div>
        <Button variant="outline" onClick={refreshData} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {currentView === 'dashboard' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4"><p className="text-sm text-muted-foreground">Revendedores</p><p className="text-2xl font-bold">{summary.totalResellers}</p></Card>
            <Card className="p-4"><p className="text-sm text-muted-foreground">Clientes indicados</p><p className="text-2xl font-bold">{summary.totalClients}</p></Card>
            <Card className="p-4"><p className="text-sm text-muted-foreground">Comissões geradas</p><p className="text-2xl font-bold">{formatCurrency(summary.totalCommissions)}</p></Card>
            <Card className="p-4"><p className="text-sm text-muted-foreground">Comissões pagas</p><p className="text-2xl font-bold">{formatCurrency(summary.totalPaid)}</p></Card>
          </div>

          {resellerProfile && (
            <Card className="p-5 space-y-4 border-primary/30">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm text-muted-foreground">Seu link de indicação</p>
                  <p className="font-semibold break-all">{inviteLink(resellerProfile.referral_code)}</p>
                </div>
                <Button onClick={() => copyText(inviteLink(resellerProfile.referral_code))}><Copy className="w-4 h-4 mr-2" />Copiar link</Button>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <Card className="p-4"><p className="text-sm text-muted-foreground">Saldo disponível</p><p className="text-xl font-bold">{formatCurrency(commissions.filter((item) => item.status === 'pending').reduce((sum, item) => sum + Number(item.commission_amount), 0))}</p></Card>
                <Card className="p-4"><p className="text-sm text-muted-foreground">Vendas indicadas</p><p className="text-xl font-bold">{clients.length}</p></Card>
                <Card className="p-4"><p className="text-sm text-muted-foreground">Status</p><Badge>{resellerProfile.status === 'active' ? 'Ativo' : 'Suspenso'}</Badge></Card>
              </div>
            </Card>
          )}

          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2 font-semibold"><Clock3 className="w-4 h-4 text-primary" />Últimas comissões</div>
            {commissions.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium">{formatCurrency(item.commission_amount)}</p>
                  <p className="text-xs text-muted-foreground">Pagamento base: {formatCurrency(item.payment_amount)} • {new Date(item.created_at).toLocaleDateString('pt-MZ')}</p>
                </div>
                <Badge variant={item.status === 'paid' ? 'default' : 'secondary'}>{item.status === 'paid' ? 'Pago' : 'Pendente'}</Badge>
              </div>
            ))}
            {commissions.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma comissão registada ainda.</p>}
          </Card>
        </>
      )}

      {currentView === 'cadastrar' && isAdmin && (
        <Card className="p-5 space-y-4 max-w-3xl">
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Nome completo</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label>País</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            <div><Label>Documento (opcional)</Label><Input value={form.document_id} onChange={(e) => setForm({ ...form, document_id: e.target.value })} /></div>
          </div>
          <Button onClick={handleCreateReseller} disabled={creating}><UserPlus className="w-4 h-4 mr-2" />{creating ? 'Cadastrando...' : 'Cadastrar revendedor'}</Button>
        </Card>
      )}

      {currentView === 'lista' && (
        <div className="space-y-3">
          {resellers.map((item) => (
            <Card key={item.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="font-semibold">{item.full_name}</p>
                <p className="text-sm text-muted-foreground">{item.email} • {item.phone}</p>
                <p className="text-xs text-muted-foreground">Código: {item.referral_code}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>{item.status === 'active' ? 'Ativo' : 'Suspenso'}</Badge>
                <Button variant="outline" onClick={() => copyText(inviteLink(item.referral_code))}><Copy className="w-4 h-4 mr-2" />Link</Button>
                {isAdmin && <Button variant="outline" onClick={() => toggleStatus(item)}>{item.status === 'active' ? 'Suspender' : 'Ativar'}</Button>}
              </div>
            </Card>
          ))}
          {resellers.length === 0 && <Card className="p-6 text-sm text-muted-foreground">Nenhum revendedor cadastrado.</Card>}
        </div>
      )}

      {currentView === 'comissoes' && (
        <div className="space-y-3">
          {commissions.map((item) => (
            <Card key={item.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{formatCurrency(item.commission_amount)}</p>
                <p className="text-sm text-muted-foreground">{item.commission_rate}% sobre {formatCurrency(item.payment_amount)}</p>
                <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString('pt-MZ')}</p>
              </div>
              <Badge variant={item.status === 'paid' ? 'default' : 'secondary'}>{item.status === 'paid' ? 'Pago' : 'Pendente'}</Badge>
            </Card>
          ))}
          {commissions.length === 0 && <Card className="p-6 text-sm text-muted-foreground">Nenhuma comissão registada.</Card>}
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
                    <SelectTrigger><SelectValue placeholder="Selecionar revendedor" /></SelectTrigger>
                    <SelectContent>
                      {resellers.map((item) => <SelectItem key={item.id} value={item.id}>{item.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Método de pagamento</Label>
                  <Select value={payoutForm.payment_method} onValueChange={(value) => setPayoutForm({ ...payoutForm, payment_method: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {payoutMethods.map((method) => <SelectItem key={method} value={method}>{method}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Referência</Label><Input value={payoutForm.reference} onChange={(e) => setPayoutForm({ ...payoutForm, reference: e.target.value })} /></div>
                <div><Label>Valor pendente</Label><Input value={formatCurrency(pendingAmount)} readOnly /></div>
              </div>
              <div><Label>Notas</Label><Textarea value={payoutForm.notes} onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })} /></div>
              <Button onClick={handleCreatePayout} disabled={paying || pendingAmount <= 0}><Wallet className="w-4 h-4 mr-2" />{paying ? 'Processando...' : 'Marcar pagamento como pago'}</Button>
            </Card>
          )}

          <div className="space-y-3">
            {payouts.map((item) => (
              <Card key={item.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{formatCurrency(item.amount)}</p>
                  <p className="text-sm text-muted-foreground">{item.payment_method} • {item.reference || 'sem referência'}</p>
                </div>
                <Badge variant={item.status === 'paid' ? 'default' : 'secondary'}>{item.status === 'paid' ? 'Pago' : 'Pendente'}</Badge>
              </Card>
            ))}
            {payouts.length === 0 && <Card className="p-6 text-sm text-muted-foreground">Nenhum pagamento registado.</Card>}
          </div>
        </div>
      )}

      {currentView === 'links' && (
        <div className="space-y-3">
          {resellers.map((item) => (
            <Card key={item.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold">{item.full_name}</p>
                  <p className="text-sm text-muted-foreground">{item.referral_code}</p>
                </div>
                <Badge>{item.status === 'active' ? 'Ativo' : 'Suspenso'}</Badge>
              </div>
              <div className="rounded-lg border border-border p-3 text-sm break-all">{inviteLink(item.referral_code)}</div>
              <Button variant="outline" onClick={() => copyText(inviteLink(item.referral_code))}><Link2 className="w-4 h-4 mr-2" />Copiar link</Button>
            </Card>
          ))}
        </div>
      )}

      {currentView === 'performance' && (
        <div className="space-y-3">
          {performance.map((item, index) => (
            <Card key={item.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">#{index + 1} • {item.full_name}</p>
                <p className="text-sm text-muted-foreground">{item.clients} clientes • {formatCurrency(item.revenue)} em receita</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatCurrency(item.commissions)}</p>
                <p className="text-xs text-muted-foreground">Comissões geradas</p>
              </div>
            </Card>
          ))}
          {performance.length === 0 && <Card className="p-6 text-sm text-muted-foreground">Sem dados de performance.</Card>}
        </div>
      )}

      {currentView === 'materiais' && (
        <div className="grid gap-4 md:grid-cols-2">
          {materials.map((item) => (
            <Card key={item.id} className="p-5 space-y-3">
              <div className="flex items-center gap-2 font-semibold"><FileText className="w-4 h-4 text-primary" />{item.title}</div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <Badge variant="secondary">{item.material_type}</Badge>
              {item.content_text ? <p className="text-sm leading-6">{item.content_text}</p> : null}
              {item.asset_url ? <a className="text-sm text-primary underline" href={item.asset_url} target="_blank" rel="noreferrer">Abrir material</a> : null}
            </Card>
          ))}
          {materials.length === 0 && <Card className="p-6 text-sm text-muted-foreground">Nenhum material disponível.</Card>}
        </div>
      )}

      {currentView === 'dashboard' && signups.length > 0 && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="w-4 h-4 text-primary" />Origem e segurança das indicações</div>
          {signups.slice(0, 6).map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <p className="font-medium">{item.referred_email || 'Novo registo'}</p>
                <p className="text-xs text-muted-foreground">Capturado em {new Date(item.created_at).toLocaleString('pt-MZ')}</p>
              </div>
              <Badge variant={item.status === 'converted' ? 'default' : 'secondary'}>{item.status === 'converted' ? 'Convertido' : 'Capturado'}</Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

export default ResellersNetworkPage;
