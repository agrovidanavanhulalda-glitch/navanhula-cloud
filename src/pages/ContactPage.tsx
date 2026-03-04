import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, LifeBuoy, Rocket, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const contactCards = [
  {
    title: 'Activação rápida',
    description: 'Crie a sua conta, confirme o acesso e entre direto na área privada do cliente.',
    icon: Rocket,
  },
  {
    title: 'Suporte ao utilizador',
    description: 'Use o ambiente autenticado para gerir operação e acompanhar o uso diário da equipa.',
    icon: LifeBuoy,
  },
  {
    title: 'Expansão comercial',
    description: 'Ideal para negócios que querem sair da gestão manual e padronizar processos.',
    icon: Users,
  },
];

const ContactPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Contacto | NAVANHULA POS';
  }, []);

  return (
    <div className="container space-y-14 py-16 lg:py-20">
      <section className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Contacto</p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Fale connosco para começar a operar com mais controlo.</h1>
          <p className="text-lg leading-8 text-muted-foreground">
            Se precisa de apresentar o sistema à sua equipa, testar a área privada ou organizar a operação comercial, o melhor próximo passo é
            criar conta e entrar no app.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/registrar">Criar conta</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/precos">Ver preços</Link>
            </Button>
          </div>
        </div>

        <Card className="rounded-[2rem] border-border bg-card/70 p-8">
          <div className="flex items-center gap-3 text-primary">
            <Clock3 className="h-5 w-5" />
            <p className="font-semibold">Como avançar</p>
          </div>
          <div className="mt-6 space-y-4 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="font-medium text-foreground">1. Aceda às páginas públicas</p>
              <p className="mt-1">Explore Home, Sobre, Preços e Recursos para entender a proposta.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="font-medium text-foreground">2. Registe a sua conta</p>
              <p className="mt-1">Use `/registrar` para criar acesso com ambiente privado protegido.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="font-medium text-foreground">3. Entre no app real</p>
              <p className="mt-1">Depois do login, o sistema redireciona automaticamente para `/app/dashboard`.</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {contactCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="rounded-[1.75rem] border-border bg-card/70 p-6">
              <div className="mb-5 inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.description}</p>
            </Card>
          );
        })}
      </section>
    </div>
  );
};

export default ContactPage;
