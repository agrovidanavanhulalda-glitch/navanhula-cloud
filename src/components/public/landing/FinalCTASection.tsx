import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FinalCTASection: React.FC = () => (
  <section className="pb-16 pt-16 lg:pb-24">
    <div className="container">
      <div
        className="overflow-hidden rounded-[2rem] border border-border px-6 py-12 text-center sm:px-10 lg:px-16 lg:py-16"
        style={{ backgroundImage: 'var(--gradient-dark)' }}
      >
        <div className="mx-auto max-w-3xl space-y-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Pronto para começar?
          </p>
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            Comece hoje a profissionalizar sua loja.
          </h2>
          <p className="mx-auto max-w-xl text-lg leading-8 text-muted-foreground">
            Experimente o NAVANHULA CLOUD gratuitamente e descubra como organizar, vender e crescer com mais confiança.
          </p>
          <Button asChild size="lg" className="mt-2 gap-2 px-10 text-base font-bold shadow-lg">
            <Link to="/registrar">
              CRIAR MINHA LOJA AGORA
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default FinalCTASection;
