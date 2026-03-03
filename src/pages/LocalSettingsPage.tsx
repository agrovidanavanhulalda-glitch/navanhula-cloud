import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Settings, Building2, Receipt, Shield, Plug, Save, Loader2,
  AlertTriangle, CheckCircle, RefreshCw, Lock, Globe, Package
} from 'lucide-react';
import { toast } from 'sonner';

const LocalSettingsPage: React.FC = () => {
  const { role, company, user, store, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Company form
  const [companyForm, setCompanyForm] = useState({
    name: '',
    nif: '',
    address: '',
    phone: '',
    city: '',
  });

  // Fiscal form
  const [fiscalForm, setFiscalForm] = useState({
    fiscal_regime: 'irpc',
    fiscal_rate: 3,
  });

  // System form
  const [systemForm, setSystemForm] = useState({
    currency: 'MZN',
    timezone: 'Africa/Maputo',
    default_min_stock: 10,
    qrcode_enabled: true,
    community_enabled: true,
  });

  const isAdmin = role === 'admin' || role === 'manager' || (role as string) === 'ceo';

  // Load data
  useEffect(() => {
    if (company && company.id !== 'local-default') {
      setCompanyForm({
        name: company.name || '',
        nif: (company as any).nif || '',
        address: (company as any).address || '',
        phone: (company as any).phone || '',
        city: (company as any).city || '',
      });
      setFiscalForm({
        fiscal_regime: (company as any).fiscal_regime || 'irpc',
        fiscal_rate: (company as any).fiscal_rate || 3,
      });
    }
  }, [company]);

  const handleSaveCompany = async () => {
    if (!companyForm.name.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: companyForm.name.trim(),
          nif: companyForm.nif.trim() || null,
          address: companyForm.address.trim() || null,
          phone: companyForm.phone.trim() || null,
          city: companyForm.city.trim() || null,
        })
        .eq('id', company!.id);

      if (error) throw error;
      toast.success('Dados da empresa salvos');
      refreshUserData();
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFiscal = async () => {
    setSaving(true);
    try {
      const rate = fiscalForm.fiscal_regime === 'irpc' ? 3 
        : fiscalForm.fiscal_regime === 'ispc' ? 5 
        : 16;

      const { error } = await supabase
        .from('companies')
        .update({
          fiscal_regime: fiscalForm.fiscal_regime,
          fiscal_rate: rate,
        })
        .eq('id', company!.id);

      if (error) throw error;
      setFiscalForm(prev => ({ ...prev, fiscal_rate: rate }));
      toast.success('Configurações fiscais salvas');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      toast.success('Email de redefinição enviado para ' + user.email);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-destructive" />
        <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Configurações
        </h1>
        <p className="text-muted-foreground">Gerencie sua empresa, fiscal, sistema e segurança</p>
      </div>

      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="empresa" className="gap-1"><Building2 className="w-4 h-4" /> Empresa</TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-1"><Receipt className="w-4 h-4" /> Fiscal</TabsTrigger>
          <TabsTrigger value="sistema" className="gap-1"><Globe className="w-4 h-4" /> Sistema</TabsTrigger>
          <TabsTrigger value="seguranca" className="gap-1"><Shield className="w-4 h-4" /> Segurança</TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-1"><Plug className="w-4 h-4" /> Integrações</TabsTrigger>
        </TabsList>

        {/* EMPRESA */}
        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Dados da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Empresa *</Label>
                  <Input value={companyForm.name} onChange={e => setCompanyForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome da empresa" />
                </div>
                <div className="space-y-2">
                  <Label>NUIT</Label>
                  <Input value={companyForm.nif} onChange={e => setCompanyForm(p => ({ ...p, nif: e.target.value }))} placeholder="Número de contribuinte" />
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input value={companyForm.address} onChange={e => setCompanyForm(p => ({ ...p, address: e.target.value }))} placeholder="Endereço completo" />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={companyForm.city} onChange={e => setCompanyForm(p => ({ ...p, city: e.target.value }))} placeholder="Maputo, Beira, etc." />
                </div>
                <div className="space-y-2">
                  <Label>Contacto</Label>
                  <Input value={companyForm.phone} onChange={e => setCompanyForm(p => ({ ...p, phone: e.target.value }))} placeholder="+258 84 000 0000" />
                </div>
              </div>
              <Button onClick={handleSaveCompany} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Empresa
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FISCAL */}
        <TabsContent value="fiscal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" /> Configurações Fiscais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Regime Fiscal</Label>
                <Select value={fiscalForm.fiscal_regime} onValueChange={v => setFiscalForm(p => ({ ...p, fiscal_regime: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="irpc">IRPC — 3%</SelectItem>
                    <SelectItem value="ispc">ISPC — 5%</SelectItem>
                    <SelectItem value="iva">IVA — 16%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Taxas Aplicáveis:</p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className={`p-3 rounded-lg text-center ${fiscalForm.fiscal_regime === 'irpc' ? 'bg-primary/10 ring-1 ring-primary' : 'bg-muted'}`}>
                    <p className="font-bold text-lg">3%</p>
                    <p className="text-muted-foreground">IRPC</p>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${fiscalForm.fiscal_regime === 'ispc' ? 'bg-primary/10 ring-1 ring-primary' : 'bg-muted'}`}>
                    <p className="font-bold text-lg">5%</p>
                    <p className="text-muted-foreground">ISPC</p>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${fiscalForm.fiscal_regime === 'iva' ? 'bg-primary/10 ring-1 ring-primary' : 'bg-muted'}`}>
                    <p className="font-bold text-lg">16%</p>
                    <p className="text-muted-foreground">IVA</p>
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveFiscal} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Fiscal
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SISTEMA */}
        <TabsContent value="sistema">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5" /> Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Moeda</Label>
                  <Select value={systemForm.currency} onValueChange={v => setSystemForm(p => ({ ...p, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MZN">MZN — Metical</SelectItem>
                      <SelectItem value="USD">USD — Dólar</SelectItem>
                      <SelectItem value="EUR">EUR — Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fuso Horário</Label>
                  <Select value={systemForm.timezone} onValueChange={v => setSystemForm(p => ({ ...p, timezone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Maputo">África/Maputo (CAT)</SelectItem>
                      <SelectItem value="Africa/Johannesburg">África/Joanesburgo (SAST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estoque Mínimo Padrão</Label>
                  <Input type="number" value={systemForm.default_min_stock} onChange={e => setSystemForm(p => ({ ...p, default_min_stock: parseInt(e.target.value) || 10 }))} />
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2"><Package className="w-4 h-4" /> Funcionalidades</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">QR Code para Pagamentos</p>
                    <p className="text-xs text-muted-foreground">Gerar QR Code nas vendas</p>
                  </div>
                  <Switch checked={systemForm.qrcode_enabled} onCheckedChange={v => setSystemForm(p => ({ ...p, qrcode_enabled: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Comunidade Empreendedora</p>
                    <p className="text-xs text-muted-foreground">Activar módulo de comunidade</p>
                  </div>
                  <Switch checked={systemForm.community_enabled} onCheckedChange={v => setSystemForm(p => ({ ...p, community_enabled: v }))} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEGURANÇA */}
        <TabsContent value="seguranca">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Conta e Senha</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm"><strong>Email:</strong> {user?.email || '—'}</p>
                  <p className="text-sm mt-1"><strong>Nome:</strong> {user?.full_name || '—'}</p>
                  <p className="text-sm mt-1"><strong>Cargo:</strong> {
                    role === 'admin' ? 'Administrador' :
                    role === 'manager' ? 'Gerente' :
                    (role as string) === 'ceo' ? 'CEO' : 'Vendedor'
                  }</p>
                </div>
                <Button variant="outline" onClick={handleResetPassword}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Redefinir Senha
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Permissões</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {[
                    { role: 'CEO', desc: 'Visão nacional, relatórios consolidados, controle total' },
                    { role: 'Administrador', desc: 'Gestão completa da empresa, lojas, produtos e usuários' },
                    { role: 'Gerente', desc: 'Gestão de loja, stock, vendas e relatórios' },
                    { role: 'Vendedor', desc: 'Apenas PDV, caixa e vendas próprias' },
                  ].map(p => (
                    <div key={p.role} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <Badge variant="secondary" className="mt-0.5">{p.role}</Badge>
                      <p className="text-muted-foreground">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* INTEGRAÇÕES */}
        <TabsContent value="integracoes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plug className="w-5 h-5" /> Status do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Backend (Lovable Cloud)', status: true },
                { label: 'Base de Dados', status: true },
                { label: 'Autenticação', status: true },
                { label: 'Realtime (vendas)', status: true },
                { label: 'Armazenamento (mídia)', status: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <p className="text-sm font-medium">{item.label}</p>
                  <Badge variant={item.status ? 'default' : 'destructive'} className="gap-1">
                    {item.status ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {item.status ? 'Conectado' : 'Offline'}
                  </Badge>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-4">
                Loja actual: <strong>{store?.name || 'Não definida'}</strong> • 
                Empresa: <strong>{company?.name || 'Não definida'}</strong>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LocalSettingsPage;
