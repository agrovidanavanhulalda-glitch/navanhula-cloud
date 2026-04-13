import React, { useState } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Key, Plus, Copy, Shield } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import PlanGate from '@/components/monetization/PlanGate';

const ApiKeysPage = () => {
  const { company } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id;
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '' });
  const [generatedKey, setGeneratedKey] = useState('');

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api-keys', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const createKey = useMutation({
    mutationFn: async () => {
      const rawKey = 'nava_' + crypto.randomUUID().replace(/-/g, '');
      const prefix = rawKey.substring(0, 12);
      // Simple hash for demo - in production use proper hashing
      const encoder = new TextEncoder();
      const data = encoder.encode(rawKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase.from('api_keys').insert({
        company_id: companyId!,
        key_hash: keyHash,
        key_prefix: prefix,
        name: form.name || 'Default',
        permissions: ['read', 'write'],
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
      return rawKey;
    },
    onSuccess: (key) => {
      setGeneratedKey(key);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API Key criada!');
    },
    onError: () => toast.error('Erro ao criar API Key'),
  });

  const copyKey = () => {
    navigator.clipboard.writeText(generatedKey);
    toast.success('Key copiada!');
  };

  return (
    <PlanGate module="api">
      <PermissionGate module="settings">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
              <p className="text-sm text-muted-foreground">Gerir chaves de acesso para integrações externas</p>
            </div>
            <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) setGeneratedKey(''); }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Nova API Key</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Criar API Key</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  {generatedKey ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Guarde esta chave. Ela não será mostrada novamente.</p>
                      <div className="flex gap-2">
                        <Input value={generatedKey} readOnly className="font-mono text-xs" />
                        <Button size="icon" variant="outline" onClick={copyKey}><Copy className="w-4 h-4" /></Button>
                      </div>
                      <Button className="w-full" onClick={() => { setShowAdd(false); setGeneratedKey(''); }}>Fechar</Button>
                    </div>
                  ) : (
                    <>
                      <div><Label>Nome da Key</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: App Mobile" /></div>
                      <Button className="w-full" onClick={() => createKey.mutate()}>Gerar Key</Button>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardContent className="pt-6 flex items-center gap-3">
              <Key className="w-8 h-8 text-primary" />
              <div><p className="text-sm text-muted-foreground">Keys Ativas</p><p className="text-2xl font-bold">{keys.filter((k: any) => k.is_active).length}</p></div>
            </CardContent></Card>
            <Card><CardContent className="pt-6 flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div><p className="text-sm text-muted-foreground">Rate Limit</p><p className="text-2xl font-bold">1000/h</p></div>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Chaves de API</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Prefixo</TableHead>
                    <TableHead>Permissões</TableHead>
                    <TableHead>Último Uso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center">Carregando...</TableCell></TableRow>
                  ) : keys.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma API Key criada</TableCell></TableRow>
                  ) : keys.map((k: any) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.name}</TableCell>
                      <TableCell className="font-mono text-sm">{k.key_prefix}...</TableCell>
                      <TableCell>
                        {(k.permissions as string[])?.map((p: string) => (
                          <Badge key={p} variant="outline" className="mr-1">{p}</Badge>
                        ))}
                      </TableCell>
                      <TableCell className="text-sm">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('pt-MZ') : 'Nunca'}</TableCell>
                      <TableCell><Badge variant={k.is_active ? 'default' : 'secondary'}>{k.is_active ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(k.created_at).toLocaleDateString('pt-MZ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </PermissionGate>
    </PlanGate>
  );
};

export default ApiKeysPage;
