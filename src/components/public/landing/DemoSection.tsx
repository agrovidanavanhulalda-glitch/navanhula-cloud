import React from 'react';
import { motion } from 'framer-motion';

const DemoSection: React.FC = () => (
  <section id="demo" className="bg-[#F5F7FA] py-20 lg:py-32">
    <div className="container">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="text-3xl font-black tracking-tight text-[#0B3C5D] sm:text-4xl lg:text-5xl">
          Veja o sistema em ação
        </h2>
        
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 overflow-hidden rounded-[2.5rem] border-8 border-white bg-white shadow-[0_48px_80px_-16px_rgba(11,60,93,0.15)]"
        >
          <img 
            src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426" 
            alt="Relatórios NAVANHULA CLOUD" 
            className="w-full"
          />
        </motion.div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <p className="text-2xl font-black text-[#0B3C5D]">
            Simples, poderoso e em tempo real
          </p>
          <div className="h-1.5 w-20 rounded-full bg-[#F4B400]" />
        </div>
      </div>
    </div>
  </section>
);

export default DemoSection;