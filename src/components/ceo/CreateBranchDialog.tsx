import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onCreated: () => void;
}

const CreateBranchDialog: React.FC<Props> = ({ onCreated }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', nif: '', phone: '', address: '', city: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    setLoading(true);
    try {
      const { error } = await (supabase as any).rpc('create_branch_company', {
        p_name: form.name.trim(),
        p_nif: form.nif || null,
        p_phone: form.phone || null,
        p_address: form.address || null,
        p_city: form.city || null,
      });
      if (error) throw error;
      toast.success(`Filial "${form.name}" criada com sucesso!`);
      setForm({ name: '', nif: '', phone: '', address: '', city: '' });
      setOpen(false);
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar filial');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Criar Filial
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Filial</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="branch-name">Nome da Filial *</Label>
            <Input id="branch-name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Filial Maputo Centro" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="branch-nif">NUIT</Label>
              <Input id="branch-nif" value={form.nif} onChange={e => setForm(p => ({ ...p, nif: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="branch-phone">Telefone</Label>
              <Input id="branch-phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="branch-city">Cidade</Label>
              <Input id="branch-city" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="branch-address">Endereço</Label>
              <Input id="branch-address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Filial'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBranchDialog;
