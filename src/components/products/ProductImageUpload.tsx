import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProductImageUploadProps {
  currentUrl: string | null;
  productId?: string;
  onUploaded: (url: string) => void;
  label?: string;
  compact?: boolean;
}

const ProductImageUpload: React.FC<ProductImageUploadProps> = ({ 
  currentUrl, 
  productId, 
  onUploaded,
  label,
  compact
}) => {
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

    // Show preview immediately for better UX
    const localUrl = URL.createObjectURL(file);
    if (!compact) setPreview(localUrl);

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const id = productId || crypto.randomUUID();
      const filename = `${id}-${Date.now()}.${ext}`;
      const path = `products/${filename}`;

      const { error } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(path);

      onUploaded(publicUrl);
      if (!compact) setPreview(publicUrl);
      else setPreview(null); // Reset for compact mode (gallery addition)
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
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : (label || <Plus className="w-4 h-4" />)}
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

const Plus: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M5 12h14"/><path d="M12 5v14"/>
  </svg>
);

export default ProductImageUpload;