import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const WHATSAPP_LINK = "https://wa.me/258860498852?text=Olá,%20quero%20ver%20como%20o%20NAVANHULA%20pode%20funcionar%20no%20meu%20negócio";

const HeroSection: React.FC = () => (
  <section className="relative overflow-hidden bg-white pt-32 pb-16 lg:pt-48 lg:pb-32">
    <div className="container relative z-10">
      <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-[#1E5A8A]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1E5A8A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1E5A8A]"></span>
            </span>
            SaaS de Gestão Empresarial
          </div>

          <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-[#0B3C5D] sm:text-6xl lg:text-7xl">
            Controle total do seu negócio em tempo real
          </h1>
          
          <p className="max-w-xl text-xl leading-relaxed text-[#0B3C5D]/70">
            Pare de perder dinheiro com stock desorganizado. O NAVANHULA mostra vendas, lucro e produtos automaticamente.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Button 
              asChild 
              size="lg" 
              className="bg-[#F4B400] hover:bg-[#F4B400]/90 text-[#0B3C5D] font-black rounded-full px-10 h-16 text-lg shadow-xl shadow-yellow-500/20"
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
              className="border-2 border-[#1E5A8A] text-[#1E5A8A] hover:bg-[#1E5A8A]/5 font-bold rounded-full px-10 h-16 text-lg"
            >
              <a href="#demo">
                <Play className="mr-2 h-5 w-5 fill-current" />
                Ver Demonstração
              </a>
            </Button>
          </div>
          
          <div className="flex items-center gap-4 pt-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-gray-200">
                  <img src={`https://i.pravatar.cc/150?u=${i + 10}`} alt="User" className="rounded-full" />
                </div>
              ))}
            </div>
            <p className="text-sm font-bold text-[#0B3C5D]/60">
              <span className="text-[#0B3C5D] font-black">+500 empresas</span> já confiam no Navanhula
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <div className="mx-auto h-4 w-1/3 rounded-full bg-gray-200/50" />
            </div>
            <img 
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2426" 
              alt="Dashboard NAVANHULA CLOUD" 
              className="w-full"
            />
          </div>
          {/* Decorative elements */}
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[#F4B400]/10 blur-3xl animate-pulse" />
          <div className="absolute -top-10 -right-10 h-64 w-64 rounded-full bg-[#1E5A8A]/10 blur-[100px]" />
        </motion.div>
      </div>
    </div>
  </section>
);

export default HeroSection;