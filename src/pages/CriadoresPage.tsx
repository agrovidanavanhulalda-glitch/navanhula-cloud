import React, { useState } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MapPin, BarChart3, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppBreadcrumb from '@/components/layout/AppBreadcrumb';
import CriadoresForm from '@/components/criadores/CriadoresForm';
import CriadoresList from '@/components/criadores/CriadoresList';
import CriadoresMapView from '@/components/criadores/CriadoresMapView';
import CriadoresDashboard from '@/components/criadores/CriadoresDashboard';

const CriadoresPage: React.FC = () => {
  const { company } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('lista');

  const { data: criadores = [], refetch, isLoading } = useQuery({
    queryKey: ['criadores', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('criadores' as any)
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!company?.id,
  });

  const handleSaved = () => {
    setShowForm(false);
    setEditingId(null);
    refetch();
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowForm(true);
    setActiveTab('lista');
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <AppBreadcrumb />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Criadores</h1>
          <p className="text-sm text-muted-foreground">Cadastro, mapa e análise de criadores de frango</p>
        </div>
        <Button onClick={() => { setEditingId(null); setShowForm(!showForm); }} className="gap-2">
          <Plus className="h-4 w-4" />
          {showForm ? 'Fechar Formulário' : 'Novo Criador'}
        </Button>
      </div>

      {showForm && (
        <CriadoresForm
          companyId={company?.id || ''}
          editingId={editingId}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditingId(null); }}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lista" className="gap-2"><Users className="h-4 w-4" />Lista</TabsTrigger>
          <TabsTrigger value="mapa" className="gap-2"><MapPin className="h-4 w-4" />Mapa</TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2"><BarChart3 className="h-4 w-4" />Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <CriadoresList criadores={criadores} isLoading={isLoading} onEdit={handleEdit} onRefresh={refetch} />
        </TabsContent>

        <TabsContent value="mapa">
          <CriadoresMapView criadores={criadores} />
        </TabsContent>

        <TabsContent value="dashboard">
          <CriadoresDashboard criadores={criadores} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CriadoresPage;
