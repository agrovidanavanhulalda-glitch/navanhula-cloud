import React from 'react';
import {
  ShoppingCart,
  Boxes,
  BarChart3,
  Building2,
  FileSpreadsheet,
  TrendingUp,
} from 'lucide-react';
import SectionHeading from '@/components/public/SectionHeading';
import { Card } from '@/components/ui/card';

const benefits = [
  { icon: ShoppingCart, title: 'Controle total das vendas', desc: 'Registe vendas, emita recibos e acompanhe resultados em tempo real.' },
  { icon: Boxes, title: 'Gestão profissional de produtos', desc: 'Organize estoque, preços e categorias com alertas automáticos.' },
  { icon: BarChart3, title: 'Relatórios inteligentes', desc: 'Veja dados claros sobre vendas, lucros e desempenho do negócio.' },
  { icon: Building2, title: 'Sistema multi-loja', desc: 'Gerencie várias lojas a partir de um único painel centralizado.' },
  { icon: FileSpreadsheet, title: 'Documentos automáticos', desc: 'Gere faturas, cotações e recibos profissionais automaticamente.' },
  { icon: TrendingUp, title: 'Dashboard de crescimento', desc: 'Indicadores inteligentes para ajudar na tomada de decisão.' },
];

const BenefitsSection: React.FC = () => (
  <section id="beneficios" className="scroll-mt-28">
    <div className="container py-16 lg:py-24">
      <SectionHeading
        eyebrow="Por que escolher"
        title="Tudo que sua empresa precisa para crescer"
        description="Ferramentas profissionais que simplificam a gestão e multiplicam resultados."
        align="center"
        className="mx-auto max-w-3xl"
      />

      <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {benefits.map((b) => (
          <Card key={b.title} className="group rounded-[1.75rem] border-border bg-card/70 p-6 transition-shadow hover:shadow-lg">
            <div className="mb-5 inline-flex rounded-2xl bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <b.icon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold tracking-tight">{b.title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{b.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  </section>
);

export default BenefitsSection;
