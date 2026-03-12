import React from 'react';
import { CirclePlay } from 'lucide-react';
import SectionHeading from '@/components/public/SectionHeading';
import { Card } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';

const DemoSection: React.FC = () => (
  <section id="demo" className="scroll-mt-28 border-y border-border/60 bg-card/30">
    <div className="container grid gap-10 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-24">
      <SectionHeading
        eyebrow="Demonstração"
        title="Veja o NAVANHULA ERP em funcionamento"
        description="Assista à demonstração e descubra como o sistema pode transformar a gestão do seu negócio."
      />

      <Card className="overflow-hidden rounded-[2rem] border-border bg-card/70 p-4">
        <AspectRatio ratio={16 / 9}>
          <div
            className="flex h-full flex-col justify-between rounded-[1.5rem] border border-border px-6 py-6"
            style={{ backgroundImage: 'var(--gradient-dark)' }}
          >
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-sm text-muted-foreground">
              <CirclePlay className="h-4 w-4 text-primary" />
              Área para vídeo de demonstração
            </div>
            <div className="space-y-4">
              <h3 className="max-w-lg text-2xl font-black tracking-tight sm:text-3xl">
                Vendas, estoque, caixa e relatórios numa apresentação simples e objetiva.
              </h3>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {['POS', 'Estoque', 'Financeiro', 'Relatórios'].map((t) => (
                  <span key={t} className="rounded-full border border-border bg-background/70 px-3 py-1">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </AspectRatio>
      </Card>
    </div>
  </section>
);

export default DemoSection;
