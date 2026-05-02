import React from 'react';
import { XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const problems = [
  "Perda de produtos",
  "Falta de controle de vendas",
  "Não sabe o lucro real",
  "Dificuldade em gerir funcionários"
];

const ProblemSection: React.FC = () => (
  <section className="bg-[#F5F7FA] py-20 lg:py-32">
    <div className="container">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-black tracking-tight text-[#0B3C5D] sm:text-4xl">
          Você ainda controla seu negócio no caderno ou Excel?
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {problems.map((problem, index) => (
            <motion.div
              key={problem}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4 rounded-xl bg-white p-6 shadow-sm border border-gray-100"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                <XCircle className="h-6 w-6" />
              </div>
              <span className="text-lg font-semibold text-[#0B3C5D]">{problem}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default ProblemSection;