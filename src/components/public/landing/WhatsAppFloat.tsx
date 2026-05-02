import React from 'react';
import { MessageCircle } from 'lucide-react';

const WHATSAPP_LINK = "https://wa.me/258840000000?text=Olá,%20quero%20ver%20como%20o%20NAVANHULA%20pode%20funcionar%20no%20meu%20negócio";

const WhatsAppFloat: React.FC = () => (
  <a
    href={WHATSAPP_LINK}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Falar no WhatsApp"
    className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl transition-all hover:scale-110 active:scale-95 group"
  >
    <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
    <MessageCircle className="h-8 w-8 relative z-10" />
    
    <span className="absolute right-full mr-4 whitespace-nowrap rounded-lg bg-[#0B3C5D] px-4 py-2 text-sm font-bold text-white shadow-xl opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
      Fale Connosco
    </span>
  </a>
);

export default WhatsAppFloat;