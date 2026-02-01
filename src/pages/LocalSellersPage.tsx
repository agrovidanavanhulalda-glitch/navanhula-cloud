import React, { useState } from 'react';
import { useLocalPOS } from '@/contexts/LocalPOSContext';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  Search,
  Mail,
  Store,
  Shield,
  AlertTriangle
} from 'lucide-react';

// Note: Sellers management will be integrated with Supabase in future

const LocalSellersPage: React.FC = () => {
  const { stores } = useLocalPOS();
  const { role, user: currentUser } = useAuth();

  const isAdmin = role === 'admin' || role === 'manager';

  // Placeholder - sellers will come from Supabase profiles table
  const sellers = currentUser ? [{
    id: currentUser.id,
    name: currentUser.full_name,
    email: currentUser.email,
    role: role || 'seller',
    storeId: currentUser.store_id,
  }] : [];

  const [searchTerm, setSearchTerm] = useState('');

  // Filter users
  const filteredUsers = sellers.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get store name
  const getStoreName = (storeId?: string) => {
    if (!storeId) return 'Todas';
    const store = stores.find(s => s.id === storeId);
    return store?.name || 'Desconhecida';
  };

  // Get role label
  const getRoleLabel = (userRole: string) => {
    switch (userRole) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'seller': return 'Vendedor';
      default: return userRole;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Vendedores / Usuários
          </h1>
          <p className="text-muted-foreground">
            Gestão de usuários (integração com backend em breve)
          </p>
        </div>
        {isAdmin && (
          <Button disabled>
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        )}
      </div>

      {/* Info Card */}
      <Card className="p-6 mb-6 bg-muted/50">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <div>
            <p className="font-medium">Funcionalidade em Desenvolvimento</p>
            <p className="text-sm text-muted-foreground">
              A gestão completa de vendedores será habilitada após a integração com o backend.
              Atualmente você pode ver seu próprio usuário.
            </p>
          </div>
        </div>
      </Card>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar usuário..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Current User Info */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Nome</th>
                <th className="text-left p-4 font-medium">Email</th>
                <th className="text-left p-4 font-medium">Função</th>
                <th className="text-left p-4 font-medium">Loja</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div className="font-medium">{user.name}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {user.email}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      <Shield className="w-3 h-3 mr-1" />
                      {getRoleLabel(user.role)}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Store className="w-4 h-4" />
                      {getStoreName(user.storeId)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum usuário encontrado</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LocalSellersPage;
