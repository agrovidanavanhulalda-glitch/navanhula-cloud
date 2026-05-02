import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const WHATSAPP_LINK = "https://wa.me/258840000000?text=Olá,%20quero%20ver%20como%20o%20NAVANHULA%20pode%20funcionar%20no%20meu%20negócio";

const OfferSection: React.FC = () => (
  <section id="precos" className="bg-white py-20 lg:py-32">
    <div className="container">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[3rem] bg-[#0B3C5D] p-8 text-white shadow-2xl lg:p-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Criamos seu sistema gratuitamente
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-blue-100/80">
              Configuramos tudo para você e mostramos funcionando no seu negócio antes de qualquer pagamento.
            </p>
            
            <div className="mt-10 space-y-4">
              {[
                "Sem taxa de configuração",
                "Suporte prioritário",
                "Treinamento para sua equipe",
                "Migração de dados inclusa"
              ].map((text) => (
                <div key={text} className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-[#F4B400]" />
                  <span className="font-semibold">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-3xl bg-white/10 p-10 backdrop-blur-sm">
              <p className="text-sm font-bold uppercase tracking-widest text-blue-300">Comece sem riscos</p>
              <p className="mt-2 text-5xl font-black text-[#F4B400]">Grátis</p>
              <p className="mt-4 text-blue-100/70">Setup inicial e demonstração</p>
              
              <Button 
                asChild 
                size="lg" 
                className="mt-8 w-full bg-[#F4B400] hover:bg-[#F4B400]/90 text-[#0B3C5D] font-black rounded-full h-14"
              >
                <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                  Falar no WhatsApp
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default OfferSection;