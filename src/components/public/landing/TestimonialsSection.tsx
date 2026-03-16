import React from 'react';
import { Star, Store } from 'lucide-react';
import SectionHeading from '@/components/public/SectionHeading';
import { Card } from '@/components/ui/card';

const testimonials = [
  {
    name: 'Carlos Machava',
    role: 'Dono de supermercado — Maputo',
    quote: 'Agora consigo controlar todas vendas da minha loja em um único sistema. Já não perco dinheiro com erros.',
  },
  {
    name: 'Ana Sitoe',
    role: 'Proprietária de farmácia — Matola',
    quote: 'Os relatórios automáticos me ajudam a saber exatamente o que está vendendo e o que precisa ser reposto.',
  },
  {
    name: 'Jorge Cossa',
    role: 'Gestor de rede de lojas — Beira',
    quote: 'Com o painel CEO, controlo 4 lojas ao mesmo tempo sem sair do escritório. Transformou meu negócio.',
  },
];

const TestimonialsSection: React.FC = () => (
  <section className="border-y border-border/60 bg-card/30">
    <div className="container py-16 lg:py-24">
      <SectionHeading
        eyebrow="Prova social"
        title="Empresários que já transformaram seus negócios"
        description="Veja o que gestores dizem sobre o NAVANHULA CLOUD."
        align="center"
        className="mx-auto max-w-3xl"
      />

      <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
        {testimonials.map((t) => (
          <Card key={t.name} className="rounded-[1.75rem] border-border bg-background p-6">
            <div className="mb-4 flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-warning text-warning" />
              ))}
            </div>
            <p className="text-sm leading-7 text-muted-foreground italic">"{t.quote}"</p>
            <div className="mt-5 border-t border-border pt-4">
              <p className="font-bold text-sm">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mx-auto mt-10 flex max-w-md items-center justify-center gap-3 rounded-full border border-border bg-background/80 px-6 py-3">
        <Store className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold">+50 lojas já usam o NAVANHULA ERP</span>
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
