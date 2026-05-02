import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const WHATSAPP_LINK = "https://wa.me/258840000000?text=Olá,%20quero%20ver%20como%20o%20NAVANHULA%20pode%20funcionar%20no%20meu%20negócio";

const HeroSection: React.FC = () => (
  <section className="relative overflow-hidden bg-white pt-20 pb-16 lg:pt-32 lg:pb-32">
    <div className="container relative z-10">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-[#0B3C5D] sm:text-5xl lg:text-6xl">
            Controle total do seu negócio em tempo real
          </h1>
          
          <p className="max-w-xl text-lg leading-relaxed text-[#0B3C5D]/70">
            Pare de perder dinheiro com stock desorganizado. O NAVANHULA mostra vendas, lucro e produtos automaticamente.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Button 
              asChild 
              size="lg" 
              className="bg-[#F4B400] hover:bg-[#F4B400]/90 text-[#0B3C5D] font-bold rounded-full px-8 h-14 text-lg shadow-xl shadow-yellow-500/20"
            >
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                Começar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button 
              asChild 
              size="lg" 
              variant="outline" 
              className="border-2 border-[#1E5A8A] text-[#1E5A8A] hover:bg-[#1E5A8A]/5 font-bold rounded-full px-8 h-14 text-lg"
            >
              <Link to={{ pathname: '/', hash: '#demo' }}>
                <Play className="mr-2 h-5 w-5 fill-current" />
                Ver Demonstração
              </Link>
            </Button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative lg:ml-4"
        >
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426" 
              alt="Dashboard NAVANHULA CLOUD" 
              className="w-full"
            />
          </div>
          {/* Decorative elements */}
          <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-[#F4B400]/20 blur-2xl" />
          <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-[#1E5A8A]/10 blur-3xl" />
        </motion.div>
      </div>
    </div>
  </section>
);

export default HeroSection;