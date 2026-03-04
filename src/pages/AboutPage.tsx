import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Globe2, Shield, Store, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const values = [
  {
    title: 'Público para atrair',
    description: 'Landing pages abertas para apresentar o produto, planos, diferenciais e contacto comercial.',
    icon: Globe2,
  },
  {
    title: 'Privado para operar',
    description: 'Área autenticada protegida com dashboard, PDV, produtos, estoque, vendas e relatórios.',
    icon: Shield,
  },
  {
    title: 'Escalável para crescer',
    description: 'Estrutura pensada para empresas que começam simples e evoluem para multi-loja e equipas maiores.',
    icon: Building2,
  },
];

const audiences = [
  'Lojas de bairro e minimercados',
  'Empreendedores com múltiplos pontos de venda',
  'Equipas comerciais que precisam de fluxo claro entre visitante, cliente e operação',
];

const AboutPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Sobre | NAVANHULA POS';
  }, []);

  return (
    <div className="container space-y-16 py-16 lg:py-20">
      <section className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Sobre a plataforma</p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Um SaaS criado para ligar marketing, vendas e operação real.</h1>
          <p className="text-lg leading-8 text-muted-foreground">
            O NAVANHULA POS nasce para resolver um problema comum: o software de gestão normalmente vende mal para o visitante e opera mal
            para o cliente. Aqui, a experiência pública apresenta valor com clareza e a experiência privada entrega produtividade diária.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/registrar">Criar conta</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/recursos">Ver recursos</Link>
            </Button>
          </div>
        </div>

        <Card className="rounded-[2rem] border-border bg-card/70 p-8">
          <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Missão</p>
          <p className="mt-4 text-2xl font-semibold leading-10">
            Dar ao comerciante uma plataforma moderna para vender mais, controlar melhor e crescer com segurança.
          </p>
          <div className="mt-8 grid gap-4">
            {audiences.map((audience) => (
              <div key={audience} className="rounded-2xl border border-border bg-background/70 px-4 py-4 text-sm text-muted-foreground">
                {audience}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {values.map((value) => {
          const Icon = value.icon;
          return (
            <Card key={value.title} className="rounded-[1.75rem] border-border bg-card/70 p-6">
              <div className="mb-5 inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold">{value.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{value.description}</p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          {
            title: 'Conta única, múltiplas áreas',
            description: 'A mesma marca atende visitantes nas páginas públicas e clientes autenticados dentro do app.',
            icon: Store,
          },
          {
            title: 'Papéis e permissões',
            description: 'Cada utilizador entra no ambiente privado com acesso coerente ao seu papel operacional.',
            icon: Users2,
          },
          {
            title: 'Base para documentos comerciais',
            description: 'Cotações, faturas e recibos ficam perto da operação, não soltos em processos paralelos.',
            icon: Shield,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-[1.75rem] border border-border bg-background/60 p-6">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default AboutPage;
