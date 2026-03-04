import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const plans = [
  {
    name: 'Starter',
    price: 'Sob consulta',
    description: 'Para operações a iniciar com foco em vendas e controlo básico.',
    features: ['Dashboard privado', 'PDV e vendas', 'Produtos e estoque', 'Carteira e comunidade'],
    highlight: false,
  },
  {
    name: 'Business',
    price: 'Sob consulta',
    description: 'Para empresas que precisam de múltiplos módulos e equipa operacional.',
    features: ['Lojas múltiplas', 'Relatórios e financeiro', 'Configurações fiscais', 'Documentos comerciais'],
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Personalizado',
    description: 'Para ambientes com maior exigência de governação e expansão.',
    features: ['Fluxos customizados', 'Acesso por perfis', 'Suporte prioritário', 'Expansão modular'],
    highlight: false,
  },
];

const PricingPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Preços | NAVANHULA POS';
  }, []);

  return (
    <div className="container space-y-14 py-16 lg:py-20">
      <section className="mx-auto max-w-3xl space-y-5 text-center">
        <Badge variant="secondary" className="rounded-full px-4 py-1 text-sm">Planos</Badge>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Escolha o nível certo para a maturidade da sua operação.</h1>
        <p className="text-lg leading-8 text-muted-foreground">
          A estrutura foi desenhada para começar com rapidez e crescer para ambientes com mais lojas, equipas e complexidade fiscal.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className="relative rounded-[2rem] border-border bg-card/70 p-6"
            style={plan.highlight ? { boxShadow: 'var(--shadow-glow)' } : undefined}
          >
            {plan.highlight && (
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                <Star className="h-3.5 w-3.5" />
                Mais procurado
              </div>
            )}
            <div className="space-y-3">
              <h2 className="text-2xl font-bold">{plan.name}</h2>
              <p className="text-3xl font-black tracking-tight">{plan.price}</p>
              <p className="text-sm leading-6 text-muted-foreground">{plan.description}</p>
            </div>

            <div className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-3 rounded-xl bg-background/70 px-4 py-3 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <Button asChild className="mt-6 w-full" variant={plan.highlight ? 'default' : 'outline'}>
              <Link to="/registrar">Quero este plano</Link>
            </Button>
          </Card>
        ))}
      </section>

      <section className="rounded-[2rem] border border-border bg-card/40 p-8 text-center">
        <h2 className="text-2xl font-bold">Precisa de uma proposta para a sua empresa?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Use a área privada do sistema para organizar operação diária e emitir documentos comerciais, incluindo cotações para clientes.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/registrar">Criar conta</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/contato">Falar com a equipa</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
