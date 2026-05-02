import React from 'react';
import { MessageCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const WHATSAPP_LINK = "https://wa.me/258860498852?text=Olá,%20quero%20ver%20como%20o%20NAVANHULA%20pode%20funcionar%20no%20meu%20negócio";

const FinalCTASection: React.FC = () => (
  <section className="bg-[#0B3C5D] py-20 lg:py-32">
    <div className="container">
      <div className="mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="space-y-10"
        >
          <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Pronto para controlar seu negócio como um CEO?
          </h2>
          
          <Button 
            asChild 
            size="lg" 
            className="bg-[#F4B400] hover:bg-[#F4B400]/90 text-[#0B3C5D] font-black rounded-full px-12 h-20 text-xl shadow-2xl shadow-yellow-500/20"
          >
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-3 h-8 w-8 fill-current" />
              Falar no WhatsApp
            </a>
          </Button>

          <p className="text-blue-200/60 font-medium">
            Atendimento imediato por especialistas
          </p>
        </motion.div>
      </div>
    </div>
  </section>
);

export default FinalCTASection;