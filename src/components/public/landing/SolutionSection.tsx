import React from 'react';
import { 
  Boxes, 
  ShoppingCart, 
  BarChart3, 
  Users, 
  Building2, 
  TrendingUp 
} from 'lucide-react';
import { motion } from 'framer-motion';

const solutions = [
  {
    title: "Gestão de Stock Inteligente",
    icon: Boxes,
    color: "text-blue-500",
    bg: "bg-blue-50"
  },
  {
    title: "Controle de Vendas",
    icon: ShoppingCart,
    color: "text-emerald-500",
    bg: "bg-emerald-50"
  },
  {
    title: "Relatórios automáticos",
    icon: BarChart3,
    color: "text-purple-500",
    bg: "bg-purple-50"
  },
  {
    title: "Controle de vendedores",
    icon: Users,
    color: "text-orange-500",
    bg: "bg-orange-50"
  },
  {
    title: "Multi-empresa",
    icon: Building2,
    color: "text-indigo-500",
    bg: "bg-indigo-50"
  },
  {
    title: "Lucro em tempo real",
    icon: TrendingUp,
    color: "text-rose-500",
    bg: "bg-rose-50"
  }
];

const SolutionSection: React.FC = () => (
  <section id="recursos" className="bg-white py-20 lg:py-32">
    <div className="container">
      <div className="text-center">
        <h2 className="text-3xl font-black tracking-tight text-[#0B3C5D] sm:text-4xl lg:text-5xl">
          Tudo que você precisa, em um único sistema
        </h2>
      </div>

      <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {solutions.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="group rounded-3xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:shadow-xl lg:p-10"
          >
            <div className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${item.bg} ${item.color}`}>
              <item.icon className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-[#0B3C5D]">{item.title}</h3>
            <div className="mt-4 h-1 w-10 rounded-full bg-gray-100 transition-all group-hover:w-20 group-hover:bg-[#F4B400]" />
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default SolutionSection;