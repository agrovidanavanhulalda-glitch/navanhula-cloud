import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/contexts/i18n';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, ShieldCheck, ShieldOff, QrCode, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const TwoFactorSetup: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  // Check current 2FA status
  React.useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const totpFactors = data?.totp || [];
      const verified = totpFactors.find((f: any) => f.status === 'verified');
      setIs2FAEnabled(!!verified);
      if (verified) setFactorId(verified.id);
    } catch {
      // MFA not available
    }
  };

  const startEnrollment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'NAVANHULA Authenticator',
      });
      if (error) throw error;
      setFactorId(data.id);
      setQrUri(data.totp.uri);
      setSecret(data.totp.secret);
      setShowSetup(true);
    } catch (err: any) {
      toast.error('Erro ao configurar 2FA: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const verifyEnrollment = async () => {
    if (verifyCode.length !== 6 || !factorId) return;
    setLoading(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode,
      });
      if (verify.error) throw verify.error;

      toast.success('2FA ativado com sucesso!');
      setIs2FAEnabled(true);
      setShowSetup(false);
      setVerifyCode('');
    } catch (err: any) {
      toast.error('Código inválido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!factorId) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success('2FA desativado');
      setIs2FAEnabled(false);
      setFactorId(null);
      setShowDisable(false);
      setDisableCode('');
    } catch (err: any) {
      toast.error('Erro ao desativar 2FA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Autenticação em Dois Fatores (2FA)</h3>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {is2FAEnabled ? (
              <ShieldCheck className="w-8 h-8 text-green-600" />
            ) : (
              <ShieldOff className="w-8 h-8 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">
                {is2FAEnabled ? '2FA está ativo' : '2FA não configurado'}
              </p>
              <p className="text-sm text-muted-foreground">
                {is2FAEnabled
                  ? 'Sua conta está protegida com autenticação por aplicativo'
                  : 'Adicione uma camada extra de segurança à sua conta'}
              </p>
            </div>
          </div>
          <div>
            {is2FAEnabled ? (
              <Badge variant="default" className="bg-green-600">Ativo</Badge>
            ) : (
              <Badge variant="secondary">Inativo</Badge>
            )}
          </div>
        </div>

        <div className="mt-4">
          {is2FAEnabled ? (
            <Button variant="destructive" size="sm" onClick={() => setShowDisable(true)} disabled={loading}>
              <ShieldOff className="w-4 h-4 mr-1" /> Desativar 2FA
            </Button>
          ) : (
            <Button onClick={startEnrollment} disabled={loading}>
              <KeyRound className="w-4 h-4 mr-1" /> Configurar 2FA
            </Button>
          )}
        </div>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Configurar Autenticação 2FA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>1. Instale um aplicativo autenticador (Google Authenticator, Authy, etc.)</p>
              <p>2. Escaneie o QR Code ou insira a chave manualmente</p>
              <p>3. Digite o código de 6 dígitos gerado</p>
            </div>

            {qrUri && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`}
                  alt="QR Code 2FA"
                  className="w-48 h-48"
                />
              </div>
            )}

            {secret && (
              <div className="bg-muted/50 p-3 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Chave manual:</p>
                <p className="font-mono text-sm font-bold select-all break-all">{secret}</p>
              </div>
            )}

            <div className="flex flex-col items-center gap-2">
              <p className="text-sm font-medium">Código de verificação:</p>
              <InputOTP maxLength={6} value={verifyCode} onChange={setVerifyCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              className="w-full"
              onClick={verifyEnrollment}
              disabled={verifyCode.length !== 6 || loading}
            >
              {loading ? 'Verificando...' : 'Ativar 2FA'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={showDisable} onOpenChange={setShowDisable}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Desativar 2FA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tem a certeza de que deseja desativar a autenticação em dois fatores?
              Isso tornará a sua conta menos segura.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDisable(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1" onClick={disable2FA} disabled={loading}>
                {loading ? 'Processando...' : 'Desativar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TwoFactorSetup;
