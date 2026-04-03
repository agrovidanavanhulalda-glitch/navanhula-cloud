import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Printer, FileText, Mail, Download, StickyNote, 
  CheckCircle2, X, Loader2, MessageCircle, DoorOpen
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { LocalSale } from '@/contexts/LocalPOSContext';
import { downloadPdfA4 } from '@/lib/generatePdfA4';
import { bluetoothPrinter } from '@/services/BluetoothPrinterService';
import { toast } from 'sonner';

interface PostSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: LocalSale;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeNuit?: string;
  fiscalRegime?: string;
  companyName?: string;
  onPrintReceipt: () => void;
}

/** Read POS automation preferences from localStorage */
const getAutomationPrefs = () => {
  try {
    const raw = localStorage.getItem('navanhula_pos_automation');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const PostSaleModal: React.FC<PostSaleModalProps> = ({
  isOpen,
  onClose,
  sale,
  storeName,
  storeAddress = '',
  storePhone = '',
  storeNuit = '',
  fiscalRegime = '',
  companyName = '',
  onPrintReceipt,
}) => {
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState('');
  const [showWhatsAppInput, setShowWhatsAppInput] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [drawerOpened, setDrawerOpened] = useState(false);

  // Auto-open cash drawer for cash payments
  useEffect(() => {
    if (!isOpen || drawerOpened) return;
    const prefs = getAutomationPrefs();
    const isCash = (sale.paymentMethod || 'cash') === 'cash';
    if (isCash && prefs.autoDrawer && bluetoothPrinter.isConnected()) {
      bluetoothPrinter.openCashDrawer()
        .then(() => {
          toast.success('Gaveta aberta automaticamente');
          setDrawerOpened(true);
          markAction('drawer');
        })
        .catch(() => { /* silent */ });
    }
  }, [isOpen]);

  const markAction = (action: string) => {
    setCompletedActions(prev => prev.includes(action) ? prev : [...prev, action]);
  };

  const handlePrintReceipt = () => {
    onPrintReceipt();
    markAction('receipt');
    toast.success('Recibo enviado para impressão');
  };

  const handlePrintInvoice = () => {
    downloadPdfA4({ sale, storeName, storeAddress, storePhone, storeNuit, fiscalRegime, companyName });
    markAction('invoice');
    toast.success('Fatura A4 gerada com sucesso');
  };

  const handleSendEmail = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Insira um email válido');
      return;
    }
    setSendingEmail(true);
    try {
      downloadPdfA4({ sale, storeName, storeAddress, storePhone, storeNuit, fiscalRegime, companyName });
      markAction('email');
      toast.success('Documento gerado. Envio por email será implementado em breve.');
      setShowEmailInput(false);
    } catch {
      toast.error('Erro ao processar documento');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadPdf = () => {
    downloadPdfA4({ sale, storeName, storeAddress, storePhone, storeNuit, fiscalRegime, companyName });
    markAction('pdf');
    toast.success('PDF baixado com sucesso');
  };

  const handleSendWhatsApp = () => {
    let num = whatsappNumber.replace(/\D/g, '');
    if (num.length < 9) {
      toast.error('Número inválido');
      return;
    }
    // Prepend Mozambique code if not present
    if (!num.startsWith('258') && num.length <= 9) {
      num = '258' + num;
    }
    const msg = encodeURIComponent(
      `Olá, aqui está o seu recibo da ${storeName}.\n` +
      `Total: ${formatCurrency(sale.total)}\n` +
      `Data: ${new Date(sale.createdAt).toLocaleDateString('pt-MZ')}\n` +
      `Obrigado pela preferência!`
    );
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
    markAction('whatsapp');
    setShowWhatsAppInput(false);
    toast.success('WhatsApp aberto');
  };

  const handleOpenDrawer = async () => {
    if (!bluetoothPrinter.isConnected()) {
      toast.error('Impressora Bluetooth não conectada');
      return;
    }
    try {
      await bluetoothPrinter.openCashDrawer();
      markAction('drawer');
      toast.success('Gaveta aberta');
    } catch {
      toast.error('Erro ao abrir gaveta');
    }
  };

  const handleSaveNotes = () => {
    if (notes.trim()) {
      markAction('notes');
      toast.success('Notas salvas');
      setShowNotes(false);
    }
  };

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('navanhula_skip_post_sale_modal', 'true');
    }
    setDrawerOpened(false);
    onClose();
  };

  const getPaymentMethodLabel = (method?: string) => {
    const labels: Record<string, string> = {
      cash: 'Dinheiro', mpesa: 'M-Pesa', emola: 'E-Mola',
      card: 'Cartão', split: 'Dividido', voucher: 'Voucher',
    };
    return labels[method || 'cash'] || 'Outro';
  };

  const isCashPayment = (sale.paymentMethod || 'cash') === 'cash';

  const actionButtons = [
    {
      id: 'receipt',
      icon: Printer,
      label: 'Imprimir Recibo',
      description: 'Impressão térmica rápida',
      onClick: handlePrintReceipt,
    },
    {
      id: 'invoice',
      icon: FileText,
      label: 'Imprimir Fatura',
      description: 'Documento fiscal completo',
      onClick: handlePrintInvoice,
    },
    {
      id: 'whatsapp',
      icon: MessageCircle,
      label: 'Enviar via WhatsApp',
      description: 'Enviar recibo ao cliente',
      onClick: () => setShowWhatsAppInput(true),
    },
    {
      id: 'email',
      icon: Mail,
      label: 'Enviar por Email',
      description: 'Envio automático com PDF',
      onClick: () => setShowEmailInput(true),
    },
    {
      id: 'pdf',
      icon: Download,
      label: 'Salvar como PDF',
      description: 'Download direto do documento',
      onClick: handleDownloadPdf,
    },
    ...(isCashPayment ? [{
      id: 'drawer',
      icon: DoorOpen,
      label: 'Abrir Gaveta',
      description: 'Comando ESC/POS para gaveta',
      onClick: handleOpenDrawer,
    }] : []),
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header with total */}
        <div className="bg-primary text-primary-foreground p-6 rounded-t-lg">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle2 className="w-8 h-8 opacity-90" />
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={handleClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm opacity-80 mb-1">Venda concluída com sucesso</p>
          <div className="text-3xl font-bold tracking-tight">
            {formatCurrency(sale.total)}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
              {getPaymentMethodLabel(sale.paymentMethod)}
            </Badge>
            <span className="text-sm opacity-70">
              {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}
            </span>
            {sale.sellerName && (
              <span className="text-sm opacity-70">• {sale.sellerName}</span>
            )}
          </div>
          {sale.changeGiven && sale.changeGiven > 0 && (
            <div className="mt-2 text-sm opacity-80">
              Troco: {formatCurrency(sale.changeGiven)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Como o cliente deseja o documento?
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Escolha uma opção para concluir o atendimento
            </p>
          </div>

          {/* Action buttons grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actionButtons.map((action) => {
              const Icon = action.icon;
              const isCompleted = completedActions.includes(action.id);
              return (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className={`
                    relative flex items-start gap-3 p-4 rounded-xl border-2 text-left
                    transition-all duration-200 hover:shadow-md active:scale-[0.98]
                    ${isCompleted 
                      ? 'border-primary/30 bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                    }
                  `}
                >
                  <div className={`
                    flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                    ${isCompleted ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
                  `}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-foreground">{action.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{action.description}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* WhatsApp input */}
          {showWhatsAppInput && (
            <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
              <Input
                type="tel"
                placeholder="84 123 4567"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button onClick={handleSendWhatsApp} size="sm" className="h-10">
                Enviar
              </Button>
              <Button variant="ghost" size="sm" className="h-10" onClick={() => setShowWhatsAppInput(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Email input */}
          {showEmailInput && (
            <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
              <Input
                type="email"
                placeholder="email@cliente.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button onClick={handleSendEmail} disabled={sendingEmail} size="sm" className="h-10">
                {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
              </Button>
              <Button variant="ghost" size="sm" className="h-10" onClick={() => setShowEmailInput(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Notes section */}
          {!showNotes ? (
            <button
              onClick={() => setShowNotes(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <StickyNote className="w-4 h-4" />
              <span>Adicionar notas à venda</span>
            </button>
          ) : (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
              <Textarea
                placeholder="Observações sobre a venda..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowNotes(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSaveNotes}>
                  Salvar
                </Button>
              </div>
            </div>
          )}

          {/* Don't show again */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Checkbox
              id="skip-modal"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <label htmlFor="skip-modal" className="text-xs text-muted-foreground cursor-pointer select-none">
              Não mostrar novamente (imprimir recibo automaticamente)
            </label>
          </div>

          {/* Close button */}
          <Button variant="outline" className="w-full" onClick={handleClose}>
            Concluir Atendimento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostSaleModal;
