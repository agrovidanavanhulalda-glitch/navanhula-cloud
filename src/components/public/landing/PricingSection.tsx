import React from 'react';
import { Link } from 'react-router-dom';
import { PackageCheck, ArrowRight } from 'lucide-react';
import SectionHeading from '@/components/public/SectionHeading';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const included = [
  'Sistema completo ERP',
  'Ponto de venda (POS)',
  'Gestão de estoque',
  'Dashboard profissional',
  'Relatórios inteligentes',
  'Documentos empresariais',
  'Loja online integrada',
  'Suporte e atualizações',
];

const PricingSection: React.FC = () => (
  <section id="precos" className="scroll-mt-28">
    <div className="container py-16 lg:py-24">
      <SectionHeading
        eyebrow="Preços"
        title="Um plano simples. Tudo incluído."
        description="Sem surpresas, sem taxas escondidas. Pague apenas pelo que usa."
        align="center"
        className="mx-auto max-w-3xl"
      />

      <Card className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-[2rem] border-border">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
          {/* Left — Price */}
          <div className="border-b border-border bg-card/50 p-8 lg:border-b-0 lg:border-r">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Plano Profissional</p>
            <h3 className="mt-4 text-2xl font-black tracking-tight">NAVANHULA CLOUD</h3>
            <div className="mt-6 flex items-end gap-2">
              <span className="text-5xl font-black tracking-tight">1500 MT</span>
              <span className="pb-1.5 text-base text-muted-foreground">/ mês por loja</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Comece gratuitamente. Sem cartão de crédito. Cancele quando quiser.
            </p>
            <Button asChild size="lg" className="mt-8 w-full gap-2 text-base font-bold shadow-lg">
              <Link to="/registrar">
                COMEÇAR TESTE GRÁTIS
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Right — Features */}
          <div className="p-8">
            <p className="mb-5 text-sm font-semibold text-muted-foreground">Tudo incluído:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {included.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-xl border border-border bg-background/70 px-4 py-3">
                  <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <span className="text-sm font-medium leading-6">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  </section>
);

export default PricingSection;
