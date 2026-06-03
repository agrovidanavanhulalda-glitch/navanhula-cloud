import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface LogoUploadProps {
  currentUrl: string | null;
  companyId: string;
  onUploaded: (url: string) => void;
}

const LogoUpload: React.FC<LogoUploadProps> = ({ currentUrl, companyId, onUploaded }) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('settings.logo.error_image'));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('settings.logo.error_size'));
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `logos/${companyId}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('company_assets')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company_assets')
        .getPublicUrl(path);

      // Save to company
      await supabase.from('companies').update({ logo_url: publicUrl }).eq('id', companyId);

      onUploaded(publicUrl);
      toast.success(t('settings.logo.success'));
    } catch (err: any) {
      toast.error(t('settings.messages.save_error') + ': ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {currentUrl ? (
        <div className="flex items-center gap-4">
          <img src={currentUrl} alt="Logo" className="w-20 h-20 object-contain rounded-lg border bg-white" />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            Alterar Logo
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
          Carregar Logo
        </Button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
};

export default LogoUpload;
