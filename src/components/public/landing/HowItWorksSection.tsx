import React from 'react';
import SectionHeading from '@/components/public/SectionHeading';
import { Card } from '@/components/ui/card';

const steps = [
  { num: '01', title: 'Crie sua loja em segundos', desc: 'Cadastre-se e configure sua loja com poucos cliques.' },
  { num: '02', title: 'Cadastre seus produtos ou importe via Excel', desc: 'Adicione produtos manualmente ou importe uma planilha.' },
  { num: '03', title: 'Comece a vender e acompanhar tudo no dashboard', desc: 'Registe vendas no POS e veja relatórios em tempo real.' },
];

const HowItWorksSection: React.FC = () => (
  <section id="como-funciona" className="scroll-mt-28 border-y border-border/60 bg-card/30">
    <div className="container py-16 lg:py-24">
      <SectionHeading
        eyebrow="Como funciona"
        title="Comece a usar em 3 passos"
        description="Do registro à primeira venda em poucos minutos."
        align="center"
        className="mx-auto max-w-3xl"
      />

      <div className="relative mx-auto mt-12 grid max-w-4xl gap-6 lg:grid-cols-3">
        {/* connector line */}
        <div className="pointer-events-none absolute top-12 hidden h-px w-full bg-border lg:block" />

        {steps.map((s) => (
          <Card key={s.num} className="relative rounded-[1.75rem] border-border bg-background p-6 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-black text-primary-foreground shadow-md">
              {s.num}
            </div>
            <h3 className="text-xl font-bold tracking-tight">{s.title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{s.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
