import React from 'react';
import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '258840000000'; // Replace with actual number
const WHATSAPP_MSG = encodeURIComponent('Olá! Quero saber mais sobre o NAVANHULA CLOUD.');

const WhatsAppFloat: React.FC = () => (
  <a
    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Falar no WhatsApp"
    className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(142,70%,45%)] text-white shadow-lg transition-transform hover:scale-110"
    style={{ boxShadow: '0 4px 14px hsla(142, 70%, 45%, 0.4)' }}
  >
    <MessageCircle className="h-7 w-7" />
  </a>
);

export default WhatsAppFloat;
