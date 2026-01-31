import React, { useState } from 'react';
import { useLocalPOS } from '@/contexts/LocalPOSContext';
import { useLocalAuth } from '@/contexts/LocalAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { 
  Settings, 
  Store, 
  Save,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

// 100% LOCAL - NO ASYNC, NO BACKEND

const LocalSettingsPage: React.FC = () => {
  const { store, updateStore } = useLocalPOS();
  const { hasAccess } = useLocalAuth();

  const [formData, setFormData] = useState({
    name: store.name,
    address: store.address,
    phone: store.phone,
  });

  const isAdmin = hasAccess(['admin']);

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Nome da loja é obrigatório');
      return;
    }

    updateStore(store.id, {
      name: formData.name.trim(),
      address: formData.address.trim(),
      phone: formData.phone.trim(),
    });

    toast.success('Configurações salvas');
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-destructive" />
        <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
        <p className="text-muted-foreground">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Configurações
        </h1>
        <p className="text-muted-foreground">
          Gerencie as configurações da loja
        </p>
      </div>

      {/* Store Settings */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Store className="w-5 h-5" />
          Dados da Loja
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Loja *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome da loja"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Endereço completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+258 84 000 0000"
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Salvar Configurações
          </Button>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-4 mt-6 bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <strong>Nota:</strong> Todas as configurações são salvas localmente no navegador. 
          Os dados persistem entre sessões mas serão perdidos se limpar os dados do navegador.
        </p>
      </Card>
    </div>
  );
};

export default LocalSettingsPage;
