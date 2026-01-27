import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleLabel } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import {
  User,
  Store,
  Shield,
  LogOut,
  Moon,
  Bell,
  HelpCircle,
} from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { user, role, store, signOut } = useAuth();

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie sua conta e preferências</p>
      </div>

      {/* Profile Card */}
      <div className="pos-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{user?.full_name}</h2>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Shield className="w-4 h-4" />
              Nível de Acesso
            </div>
            <p className="font-semibold">{role ? getRoleLabel(role) : '-'}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Store className="w-4 h-4" />
              Loja
            </div>
            <p className="font-semibold">{store?.name || '-'}</p>
          </div>
        </div>
      </div>

      {/* Settings Options */}
      <div className="pos-card divide-y divide-border">
        <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span>Notificações</span>
          </div>
          <span className="text-sm text-muted-foreground">Ativadas</span>
        </button>
        <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-muted-foreground" />
            <span>Tema Escuro</span>
          </div>
          <span className="text-sm text-muted-foreground">Ativo</span>
        </button>
        <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
            <span>Ajuda e Suporte</span>
          </div>
        </button>
      </div>

      {/* Logout */}
      <Button
        variant="destructive"
        className="w-full h-12"
        onClick={signOut}
      >
        <LogOut className="w-5 h-5 mr-2" />
        Encerrar Sessão
      </Button>

      {/* Version */}
      <p className="text-center text-sm text-muted-foreground">
        NAVANHULA POS v1.0.0
      </p>
    </div>
  );
};

export default SettingsPage;
