import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useTranslation } from '@/contexts/i18n';
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
  AlertTriangle, CheckCircle, RefreshCw, Lock, Globe, Package, Image, FileText, Printer
} from 'lucide-react';
import { toast } from 'sonner';
import LogoUpload from '@/components/settings/LogoUpload';
import FiscalDocumentsManager from '@/components/settings/FiscalDocumentsManager';
import TwoFactorSetup from '@/components/settings/TwoFactorSetup';

const LocalSettingsPage: React.FC = () => {
  const { role, company, user, store, refreshUserData } = useAuth();
  const { isAdmin } = usePermissions();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Company form
  const [companyForm, setCompanyForm] = useState({
    name: '',
    nif: '',
    address: '',
    phone: '',
    email: '',
    city: '',
    country: 'Moçambique',
    logo_url: '' as string | null,
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

  // POS Automation prefs (localStorage)
  const [automationForm, setAutomationForm] = useState(() => {
    try {
      const raw = localStorage.getItem('navanhula_pos_automation');
      return raw ? JSON.parse(raw) : {
        autoPrint: false,
        autoDrawer: false,
        autoWhatsApp: false,
        autoEmail: false,
      };
    } catch { return { autoPrint: false, autoDrawer: false, autoWhatsApp: false, autoEmail: false }; }
  });

  const handleSaveAutomation = () => {
    localStorage.setItem('navanhula_pos_automation', JSON.stringify(automationForm));
    toast.success(t('settings.messages.save_success'));
  };

  

  // Load data
  useEffect(() => {
    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (company && isUuid(company.id)) {
      setCompanyForm({
        name: company.name || '',
        nif: (company as any).nif || '',
        address: (company as any).address || '',
        phone: (company as any).phone || '',
        email: (company as any).email || '',
        city: (company as any).city || '',
        country: (company as any).country || 'Moçambique',
        logo_url: (company as any).logo_url || null,
      });
      setFiscalForm({
        fiscal_regime: (company as any).fiscal_regime || 'irpc',
        fiscal_rate: (company as any).fiscal_rate || 3,
      });
    }

    if (store) {
      setSystemForm(prev => ({
        ...prev,
        timezone: (store as any).timezone || (company as any).timezone || 'Africa/Maputo',
        default_min_stock: (store as any).default_min_stock || 10,
      }));
    }
  }, [company, store]);

  const handleSaveCompany = async () => {
    if (!companyForm.name.trim()) {
      toast.error(t('settings.company.name_required') || 'Nome da empresa é obrigatório');
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
          email: companyForm.email.trim() || null,
          city: companyForm.city.trim() || null,
          country: companyForm.country.trim() || 'Moçambique',
        })
        .eq('id', company!.id);

      if (error) throw error;
      toast.success(t('settings.messages.save_success'));
      refreshUserData();
    } catch (err: any) {
      toast.error(t('settings.messages.save_error') + ': ' + err.message);
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
      toast.success(t('settings.messages.save_success'));
    } catch (err: any) {
      toast.error(t('settings.messages.save_error') + ': ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystem = async () => {
    setSaving(true);
    try {
      // Update company global settings
      const { error: companyError } = await supabase
        .from('companies')
        .update({
          currency: systemForm.currency,
          timezone: systemForm.timezone,
        })
        .eq('id', company!.id);

      if (companyError) throw companyError;

      // Update store settings if we are in a store context
      if (store?.id) {
        const { error: storeError } = await supabase
          .from('stores')
          .update({
            timezone: systemForm.timezone,
            default_min_stock: systemForm.default_min_stock,
          })
          .eq('id', store.id);
        
        if (storeError) throw storeError;
      }

      toast.success(t('settings.messages.save_success'));
      refreshUserData();
    } catch (err: any) {
      toast.error(t('settings.messages.save_error') + ': ' + err.message);
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
      toast.success(t('settings.security.reset_sent') || 'Email de redefinição enviado para ' + user.email);
    } catch (err: any) {
      toast.error(t('common.error') + ': ' + err.message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-destructive" />
        <h1 className="text-2xl font-bold mb-2">{t('settings.access_denied.title')}</h1>
        <p className="text-muted-foreground">{t('settings.access_denied.desc')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          {t('settings.title')}
        </h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-7 w-full">
          <TabsTrigger value="empresa" className="gap-1"><Building2 className="w-4 h-4" /> {t('settings.tabs.company')}</TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-1"><Receipt className="w-4 h-4" /> {t('settings.tabs.fiscal')}</TabsTrigger>
          <TabsTrigger value="documentos" className="gap-1"><FileText className="w-4 h-4" /> {t('settings.tabs.documents')}</TabsTrigger>
          <TabsTrigger value="automacao" className="gap-1"><Printer className="w-4 h-4" /> {t('settings.tabs.automation')}</TabsTrigger>
          <TabsTrigger value="sistema" className="gap-1"><Globe className="w-4 h-4" /> {t('settings.tabs.sistema')}</TabsTrigger>
          <TabsTrigger value="seguranca" className="gap-1"><Shield className="w-4 h-4" /> {t('settings.tabs.security')}</TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-1"><Plug className="w-4 h-4" /> {t('settings.tabs.integrations')}</TabsTrigger>
        </TabsList>

        {/* EMPRESA */}
        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> {t('settings.company.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Image className="w-4 h-4" /> {t('settings.company.logo')}</Label>
                <LogoUpload
                  currentUrl={companyForm.logo_url}
                  companyId={company!.id}
                  onUploaded={(url) => setCompanyForm(p => ({ ...p, logo_url: url }))}
                />
                <p className="text-xs text-muted-foreground">{t('settings.company.logo_desc')}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('settings.company.name')} *</Label>
                  <Input value={companyForm.name} onChange={e => setCompanyForm(p => ({ ...p, name: e.target.value }))} placeholder={t('settings.company.name')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.company.nuit')}</Label>
                  <Input value={companyForm.nif} onChange={e => setCompanyForm(p => ({ ...p, nif: e.target.value }))} placeholder={t('settings.company.nuit')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.company.email')}</Label>
                  <Input type="email" value={companyForm.email} onChange={e => setCompanyForm(p => ({ ...p, email: e.target.value }))} placeholder="email@empresa.com" />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.company.contact')}</Label>
                  <Input value={companyForm.phone} onChange={e => setCompanyForm(p => ({ ...p, phone: e.target.value }))} placeholder="+258 84 000 0000" />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.company.address')}</Label>
                  <Input value={companyForm.address} onChange={e => setCompanyForm(p => ({ ...p, address: e.target.value }))} placeholder={t('settings.company.address')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.company.city')}</Label>
                  <Input value={companyForm.city} onChange={e => setCompanyForm(p => ({ ...p, city: e.target.value }))} placeholder="Maputo" />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.company.country')}</Label>
                  <Input value={companyForm.country} onChange={e => setCompanyForm(p => ({ ...p, country: e.target.value }))} placeholder="Moçambique" />
                </div>
              </div>
              <Button onClick={handleSaveCompany} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {t('settings.company.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FISCAL */}
        <TabsContent value="fiscal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" /> {t('settings.fiscal.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('settings.fiscal.regime')}</Label>
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
                <p className="text-sm font-medium">{t('settings.fiscal.rates')}:</p>
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
                {t('settings.fiscal.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTOS */}
        <TabsContent value="documentos">
          <FiscalDocumentsManager />
        </TabsContent>

        {/* AUTOMAÇÃO POS */}
        <TabsContent value="automacao">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Printer className="w-5 h-5" /> {t('settings.automation.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                {t('settings.automation.desc')}
              </p>
              <div className="space-y-4">
                {[
                  { key: 'autoPrint', label: t('settings.automation.print'), desc: t('settings.automation.print_desc') },
                  { key: 'autoDrawer', label: t('settings.automation.drawer'), desc: t('settings.automation.drawer_desc') },
                  { key: 'autoWhatsApp', label: t('settings.automation.whatsapp'), desc: t('settings.automation.whatsapp_desc') },
                  { key: 'autoEmail', label: t('settings.automation.email'), desc: t('settings.automation.email_desc') },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={automationForm[item.key as keyof typeof automationForm]}
                      onCheckedChange={v => setAutomationForm((p: typeof automationForm) => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
              </div>
              <Separator />
              <Button onClick={handleSaveAutomation}>
                <Save className="w-4 h-4 mr-2" />
                {t('settings.automation.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SISTEMA */}
        <TabsContent value="sistema">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5" /> {t('settings.system.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('settings.system.currency')}</Label>
                  <Select value={systemForm.currency} onValueChange={v => setSystemForm(p => ({ ...p, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MZN">MZN — {t('common.currency.mzn')}</SelectItem>
                      <SelectItem value="USD">USD — {t('common.currency.usd')}</SelectItem>
                      <SelectItem value="EUR">EUR — {t('common.currency.eur')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.system.timezone')}</Label>
                  <Select value={systemForm.timezone} onValueChange={v => setSystemForm(p => ({ ...p, timezone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Maputo">África/Maputo (CAT)</SelectItem>
                      <SelectItem value="Africa/Johannesburg">África/Joanesburgo (SAST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.system.min_stock')}</Label>
                  <Input type="number" value={systemForm.default_min_stock} onChange={e => setSystemForm(p => ({ ...p, default_min_stock: parseInt(e.target.value) || 10 }))} />
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2"><Package className="w-4 h-4" /> {t('settings.system.features')}</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t('settings.system.qrcode')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.system.qrcode_desc')}</p>
                  </div>
                  <Switch checked={systemForm.qrcode_enabled} onCheckedChange={v => setSystemForm(p => ({ ...p, qrcode_enabled: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t('settings.system.community')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.system.community_desc')}</p>
                  </div>
                  <Switch checked={systemForm.community_enabled} onCheckedChange={v => setSystemForm(p => ({ ...p, community_enabled: v }))} />
                </div>
              </div>
              <Separator />
              <Button onClick={handleSaveSystem} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {t('settings.system.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEGURANÇA */}
        <TabsContent value="seguranca">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> {t('settings.security.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm"><strong>{t('common.email')}:</strong> {user?.email || '—'}</p>
                  <p className="text-sm mt-1"><strong>{t('common.name')}:</strong> {user?.full_name || '—'}</p>
                  <p className="text-sm mt-1"><strong>{t('sellers.role')}:</strong> {
                    role === 'admin' ? t('sellers.admin') :
                    role === 'manager' ? t('nav.manager') || 'Gerente' :
                    (role as string) === 'ceo' ? t('nav.ceoDashboard') || 'CEO' : t('sellers.seller')
                  }</p>
                </div>
                <Button variant="outline" onClick={handleResetPassword}>
                  <RefreshCw className="w-4 h-4 mr-2" /> {t('settings.security.reset_pass')}
                </Button>
              </CardContent>
            </Card>

            <TwoFactorSetup />

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
              <CardTitle className="flex items-center gap-2"><Plug className="w-5 h-5" /> {t('settings.integrations.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Backend (Lovable Cloud)', status: true },
                { label: t('settings.integrations.db'), status: true },
                { label: t('settings.integrations.auth'), status: true },
                { label: t('settings.integrations.realtime'), status: true },
                { label: t('settings.integrations.storage'), status: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <p className="text-sm font-medium">{item.label}</p>
                  <Badge variant={item.status ? 'default' : 'destructive'} className="gap-1">
                    {item.status ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {item.status ? t('settings.integrations.connected') : t('settings.integrations.offline')}
                  </Badge>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-4">
                {t('settings.integrations.current_store')}: <strong>{store?.name || t('settings.integrations.not_defined')}</strong> • 
                {t('settings.integrations.company')}: <strong>{company?.name || t('settings.integrations.not_defined')}</strong>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LocalSettingsPage;
