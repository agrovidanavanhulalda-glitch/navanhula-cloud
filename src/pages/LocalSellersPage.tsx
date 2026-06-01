import React, { useState } from 'react';
import { useLocalPOS, LocalSeller } from '@/contexts/LocalPOSContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Users, 
  Plus, 
  Search,
  Mail,
  Store,
  Shield,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Copy,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// 100% LOCAL - Gestão de vendedores offline-friendly

const LocalSellersPage: React.FC = () => {
  const { 
    sellers, 
    stores,
    currentStore,
    addSeller, 
    updateSeller, 
    deleteSeller,
    refreshData,
  } = useLocalPOS();
  const { company } = useAuth();
  const { isAdmin, role } = usePermissions();
  const targetCompanyId = (company as any)?.id;

  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingSeller, setEditingSeller] = useState<LocalSeller | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'seller' as 'admin' | 'seller',
    storeId: currentStore?.id || '',
    password: '123456',
    isActive: true,
  });

  // Filter sellers
  const filteredSellers = sellers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get store name - human readable
  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    return store?.name || 'Loja Principal';
  };

  // Get role label - human readable
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'master': return 'Master Owner';
      case 'ceo': return 'CEO';
      case 'admin': return 'Administrador';
      case 'manager': return 'Gestor';
      case 'seller': return 'Vendedor';
      case 'viewer': return 'Visualizador';
      default: return role;
    }
  };

  // Open dialog for new seller
  const handleNew = () => {
    setEditingSeller(null);
    setFormData({
      name: '',
      email: '',
      role: 'seller',
      storeId: currentStore?.id || '',
      password: '123456',
      isActive: true,
    });
    setShowDialog(true);
  };

  // Open dialog for editing
  const handleEdit = (seller: LocalSeller) => {
    setEditingSeller(seller);
    setFormData({
      name: seller.name,
      email: seller.email,
      role: seller.role,
      storeId: seller.storeId,
      password: seller.password,
      isActive: seller.isActive,
    });
    setShowDialog(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSellerInfo, setCreatedSellerInfo] = useState<{ email: string; pass: string; name: string } | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Email é obrigatório');
      return;
    }

    if (!editingSeller && formData.password.trim().length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSeller) {
        await updateSeller(editingSeller.id, formData);
        toast.success('Vendedor atualizado!');
        setShowDialog(false);
        setEditingSeller(null);
        setIsSubmitting(false); // Fix potential state update before return
        return;
      }

      const tempPassword = formData.password.trim() || 'NAV@12345';
      
      // ENTERPRISE: Use RPC to create user without email confirmation
      // @ts-ignore - supabase is imported but TS might be acting up if context is lost
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_enterprise_seller', {
        p_store_id: formData.storeId,
        p_full_name: formData.name.trim(),
        p_email: formData.email.trim().toLowerCase(),
        p_password: tempPassword,
        p_role: formData.role
      });

      if (rpcError) throw rpcError;

      // Update local context
      // @ts-ignore - refreshData is available via useLocalPOS destructuring
      await refreshData();
      
      setCreatedSellerInfo({ 
        email: formData.email.trim().toLowerCase(), 
        pass: tempPassword,
        name: formData.name.trim()
      });
      setShowDialog(false);
      setEditingSeller(null);
      setShowSuccessDialog(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar vendedor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  // Toggle active status
  const handleToggleActive = (seller: LocalSeller) => {
    updateSeller(seller.id, { isActive: !seller.isActive });
    toast.success(seller.isActive ? 'Vendedor desativado' : 'Vendedor ativado');
  };

  // Delete seller
  const handleDelete = (seller: LocalSeller) => {
    if (window.confirm(`Remover vendedor "${seller.name}"?`)) {
      deleteSeller(seller.id);
      toast.success('Vendedor removido');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Vendedores
          </h1>
          <p className="text-muted-foreground">
            Gestão de vendedores da loja
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Vendedor
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar vendedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Sellers List */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Vendedor</th>
                <th className="text-left p-4 font-medium">Email</th>
                <th className="text-left p-4 font-medium">Função</th>
                <th className="text-left p-4 font-medium">Loja</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-right p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSellers.map((seller) => (
                <tr key={seller.id} className="hover:bg-muted/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        seller.isActive ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        {seller.isActive ? (
                          <UserCheck className="w-5 h-5 text-primary" />
                        ) : (
                          <UserX className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="font-medium">{seller.name}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {seller.email}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={seller.role === 'admin' ? 'default' : 'secondary'}>
                      <Shield className="w-3 h-3 mr-1" />
                      {getRoleLabel(seller.role)}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Store className="w-4 h-4" />
                      {getStoreName(seller.storeId)}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={seller.isActive ? 'default' : 'secondary'} className={
                      seller.isActive ? 'bg-green-500' : ''
                    }>
                      {seller.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleToggleActive(seller)}
                      >
                        {seller.isActive ? (
                          <UserX className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit(seller)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(seller)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSellers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum vendedor encontrado</p>
            <Button variant="link" onClick={handleNew}>
              Criar primeiro vendedor
            </Button>
          </div>
        )}
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSeller ? 'Editar Vendedor' : 'Novo Vendedor'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Função</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value: 'admin' | 'seller') => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="seller">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Loja</Label>
              <Select 
                value={formData.storeId} 
                onValueChange={(value) => setFormData({ ...formData, storeId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stores.map(store => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha (PIN)</Label>
              <Input
                id="password"
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="123456"
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 6 caracteres para o acesso do vendedor
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Vendedor Ativo</Label>
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingSeller ? 'Salvar' : 'Criar Vendedor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md border-2 border-primary/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <UserCheck className="w-6 h-6" />
              Vendedor Criado com Sucesso!
            </DialogTitle>
          </DialogHeader>
          
          <div className="bg-muted/50 p-6 rounded-xl space-y-4 border border-border">
            <p className="text-sm text-muted-foreground">
              O vendedor <strong>{createdSellerInfo?.name}</strong> foi ativado. 
              Copie as credenciais abaixo para o primeiro acesso:
            </p>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-widest opacity-70">Email de Acesso</Label>
                <div className="flex items-center gap-2 bg-background p-3 rounded-lg border border-border group">
                  <code className="flex-1 text-sm font-mono truncate">{createdSellerInfo?.email}</code>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => createdSellerInfo && copyToClipboard(createdSellerInfo.email, 'Email')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-widest opacity-70">Senha Temporária</Label>
                <div className="flex items-center gap-2 bg-background p-3 rounded-lg border border-border">
                  <code className="flex-1 text-sm font-mono tracking-wider">{createdSellerInfo?.pass}</code>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => createdSellerInfo && copyToClipboard(createdSellerInfo.pass, 'Senha')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-primary/5 p-3 rounded-lg border border-primary/10">
              <Shield className="w-4 h-4 text-primary mt-0.5" />
              <p className="text-[11px] text-primary/80 leading-relaxed">
                Por segurança, o sistema solicitará a troca obrigatória de senha no primeiro login deste vendedor.
              </p>
            </div>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button className="w-full sm:w-auto px-8" onClick={() => setShowSuccessDialog(false)}>
              Concluído
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocalSellersPage;
