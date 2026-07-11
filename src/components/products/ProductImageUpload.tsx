import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, Loader2, ImageIcon, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface ProductImageUploadProps {
  currentUrl: string | null;
  productId?: string;
  onUploaded: (url: string) => void;
  label?: React.ReactNode;
  compact?: boolean;
}

const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  currentUrl,
  productId,
  onUploaded,
  label,
  compact,
}) => {
  const { company } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }
    if (!company?.id) {
      toast.error('Empresa não identificada.');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    if (!compact) setPreview(localUrl);

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const id = productId || crypto.randomUUID();
      const filename = `${id}-${Date.now()}.${ext}`;
      // Sprint 2.1: storage policy requires {company_id}/... as first segment
      const path = `${company.id}/products/${filename}`;

      const { error } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(path);

      onUploaded(publicUrl);
      if (!compact) setPreview(publicUrl);
      else setPreview(null);
    } catch (err: any) {
      toast.error('Erro ao enviar: ' + err.message);
      setPreview(currentUrl);
    } finally {
      setUploading(false);
    }
  };

  if (compact) {
    return (
      <div
        className="border-2 border-dashed rounded-lg h-20 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : (label ?? <Plus className="w-4 h-4" />)}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>
    );
  }

  return (
    <div
      className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => fileRef.current?.click()}
    >
      {preview ? (
        <img src={preview} alt="Produto" className="w-full h-32 object-contain rounded mb-2" />
      ) : (
        <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
      )}
      <Button variant="ghost" size="sm" disabled={uploading} type="button">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
        {preview ? 'Alterar Imagem' : 'Adicionar Imagem'}
      </Button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
};

export default ProductImageUpload;
