import React from 'react';
import { motion } from 'framer-motion';

const DemoSection: React.FC = () => (
  <section id="demo" className="bg-[#F5F7FA] py-20 lg:py-32">
    <div className="container">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-black tracking-tight text-[#0B3C5D] sm:text-4xl">
          Veja o sistema em ação
        </h2>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-2xl"
        >
          <img 
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2426" 
            alt="Demo NAVANHULA CLOUD" 
            className="w-full"
          />
        </motion.div>

        <p className="mt-8 text-xl font-bold text-[#0B3C5D]">
          Simples, poderoso e em tempo real
        </p>
      </div>
    </div>
  </section>
);

export default DemoSection;