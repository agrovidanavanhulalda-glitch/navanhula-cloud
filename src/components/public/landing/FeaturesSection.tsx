import React from 'react';
import {
  ShoppingCart,
  Boxes,
  Users,
  BarChart3,
  FileSpreadsheet,
  Landmark,
  Building2,
  Globe,
} from 'lucide-react';
import SectionHeading from '@/components/public/SectionHeading';
import { Card } from '@/components/ui/card';

const features = [
  { icon: ShoppingCart, title: 'Vendas rápidas no POS', desc: 'Atenda clientes com rapidez e eficiência no ponto de venda.' },
  { icon: Boxes, title: 'Gestão de estoque', desc: 'Controle entradas, saídas e reposição com alertas automáticos.' },
  { icon: Users, title: 'Cadastro de clientes', desc: 'Perfis completos com histórico de compras e classificação VIP.' },
  { icon: BarChart3, title: 'Relatórios automáticos', desc: 'Vendas, lucros e desempenho em gráficos claros e exportáveis.' },
  { icon: FileSpreadsheet, title: 'Documentos profissionais', desc: 'Faturas, cotações, proformas e recibos com layout empresarial.' },
  { icon: Landmark, title: 'Painel CEO global', desc: 'Visão completa de todas as lojas, faturamento e crescimento.' },
  { icon: Building2, title: 'Sistema SaaS multi-loja', desc: 'Cada loja com dashboard, usuários e relatórios próprios.' },
  { icon: Globe, title: 'Suporte multi-idioma', desc: 'Interface em Português e English com troca instantânea.' },
];

const FeaturesSection: React.FC = () => (
  <section id="recursos" className="scroll-mt-28">
    <div className="container py-16 lg:py-24">
      <SectionHeading
        eyebrow="Funcionalidades"
        title="Recursos poderosos para cada área do negócio"
        description="Do balcão ao escritório do CEO, cada módulo foi desenhado para profissionalizar sua operação."
        align="center"
        className="mx-auto max-w-3xl"
      />

      <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {features.map((f) => (
          <Card key={f.title} className="rounded-[1.5rem] border-border bg-card/70 p-5">
            <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2.5 text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-bold tracking-tight">{f.title}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{f.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
