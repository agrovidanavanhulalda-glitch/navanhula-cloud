import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ProductImageUploadProps {
  currentUrl: string | null;
  productId?: string;
  onUploaded: (url: string) => void;
}

const ProductImageUpload: React.FC<ProductImageUploadProps> = ({ currentUrl, productId, onUploaded }) => {
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

    // Show preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const id = productId || crypto.randomUUID();
      const path = `products/${id}.${ext}`;

      const { error } = await supabase.storage
        .from('company_assets')
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('company_assets')
        .getPublicUrl(path);

      onUploaded(publicUrl);
      setPreview(publicUrl);
    } catch (err: any) {
      toast.error('Erro ao enviar: ' + err.message);
      setPreview(currentUrl);
    } finally {
      setUploading(false);
    }
  };

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
