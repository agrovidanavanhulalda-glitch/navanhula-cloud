import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Layers3, ShieldCheck, Store, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const pillars = [
  {
    title: 'Operação em tempo real',
    description: 'PDV, produtos, estoque e vendas com fluxo pensado para loja e equipa comercial.',
    icon: Store,
  },
  {
    title: 'Gestão financeira integrada',
    description: 'Relatórios, carteira, histórico e visão consolidada do negócio num só painel.',
    icon: WalletCards,
  },
  {
    title: 'Controlo seguro por utilizador',
    description: 'Ambiente público para visitantes e área privada protegida para cada cliente.',
    icon: ShieldCheck,
  },
];

const metrics = [
  { label: 'Módulos principais', value: '10+' },
  { label: 'Fluxos do cliente', value: 'Público + Privado' },
  { label: 'Documentos comerciais', value: 'Cotações, faturas e mais' },
];

const homeFeatures = [
  'Dashboard privado para cada cliente',
  'Emissão de cotação, proforma, fatura e recibo',
  'Gestão de lojas, produtos, estoque e vendas',
  'Comunidade e carteira no mesmo ambiente',
];

const Index = () => {
  useEffect(() => {
    document.title = 'NAVANHULA POS | SaaS de gestão comercial';
  }, []);

  return (
    <div className="relative overflow-hidden">
      <section className="border-b border-border/60">
        <div className="container grid gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="rounded-full px-4 py-1 text-sm">
                SaaS para comércio, retalho e operação multi-loja
              </Badge>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Venda em público, opere em privado e controle tudo com o <span className="text-gradient-primary">NAVANHULA POS</span>.
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                O visitante conhece o produto nas páginas públicas e, após login, entra num app real com dashboard, PDV, estoque, vendas,
                relatórios, financeiro, carteira, comunidade e configurações fiscais.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2 px-8">
                <Link to="/registrar">
                  Criar conta
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-8">
                <Link to="/precos">Ver planos</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {homeFeatures.map((feature) => (
                <div key={feature} className="flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                  <p className="text-sm text-muted-foreground">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              className="absolute inset-0 rounded-[2rem] blur-3xl"
              style={{ background: 'radial-gradient(circle at center, hsl(var(--primary) / 0.28), transparent 65%)' }}
            />
            <div
              className="relative overflow-hidden rounded-[2rem] border border-border bg-card/80 p-4 shadow-2xl"
              style={{ backgroundImage: 'var(--gradient-dark)' }}
            >
              <div className="rounded-[1.5rem] border border-border/80 bg-background/70 p-6">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Painel do cliente</p>
                    <p className="text-2xl font-bold">Operação em escala</p>
                  </div>
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    Online
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {metrics.map((metric) => (
                    <Card key={metric.label} className="rounded-2xl border-border bg-card/70 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                      <p className="mt-3 text-2xl font-bold">{metric.value}</p>
                    </Card>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <Card className="rounded-2xl border-border bg-card/70 p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="rounded-xl bg-primary/10 p-3 text-primary">
                        <Layers3 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">Fluxo completo</p>
                        <p className="text-sm text-muted-foreground">Site público + app privado no mesmo projeto</p>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                        <span>Landing pages</span>
                        <span className="font-medium text-foreground">/ , /sobre, /precos</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                        <span>Autenticação</span>
                        <span className="font-medium text-foreground">/login, /registrar</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                        <span>Área do cliente</span>
                        <span className="font-medium text-foreground">/app/*</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="rounded-2xl border-border bg-card/70 p-5">
                    <p className="text-sm text-muted-foreground">Perfeito para</p>
                    <div className="mt-4 space-y-4">
                      {['Lojas independentes', 'Pequenas cadeias', 'Operações com equipa de vendas'].map((item) => (
                        <div key={item} className="rounded-xl border border-border bg-background/70 px-4 py-3 font-medium">
                          {item}
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16 lg:py-20">
        <div className="mb-8 max-w-2xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Porque escolher</p>
          <h2 className="text-3xl font-bold tracking-tight">Uma experiência única para visitantes e clientes autenticados.</h2>
          <p className="text-muted-foreground">
            A entrada pública apresenta o produto; a zona privada concentra a operação diária, documentos fiscais e gestão do negócio.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Card key={pillar.title} className="rounded-[1.75rem] border-border bg-card/70 p-6">
                <div className="mb-5 inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{pillar.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-t border-border/60 bg-card/30">
        <div className="container flex flex-col gap-6 py-16 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Pronto para entrar?</p>
            <h2 className="text-3xl font-bold tracking-tight">Crie a sua conta e vá direto para o painel privado.</h2>
            <p className="text-muted-foreground">
              Depois do login, o utilizador entra em `/app/dashboard` com acesso às rotas privadas protegidas por autenticação.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="px-8">
              <Link to="/registrar">Abrir conta</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-8">
              <Link to="/recursos">Explorar recursos</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
