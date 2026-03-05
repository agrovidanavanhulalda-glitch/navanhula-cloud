import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BadgeCheck,
  Boxes,
  Building2,
  ChartColumnBig,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const problems = [
  'Produtos desaparecem do estoque',
  'Funcionários fazem vendas sem registro',
  'O dono não sabe quanto a empresa faturou',
  'Difícil controlar várias lojas',
  'Falta de relatórios claros',
];

const solutions = [
  'Controlar todas as vendas',
  'Saber exatamente quanto entrou no caixa',
  'Acompanhar estoque em tempo real',
  'Ver desempenho de vendedores',
  'Gerir várias lojas ao mesmo tempo',
];

const features = [
  {
    title: 'GESTÃO DE VENDAS',
    description: 'Registre todas as vendas com rapidez e precisão.',
    icon: ShoppingCart,
  },
  {
    title: 'CONTROLE DE ESTOQUE',
    description: 'Saiba sempre quais produtos estão acabando.',
    icon: Boxes,
  },
  {
    title: 'GESTÃO DE FUNCIONÁRIOS',
    description: 'Acompanhe o desempenho da equipe.',
    icon: Users,
  },
  {
    title: 'RELATÓRIOS INTELIGENTES',
    description: 'Veja relatórios claros para tomar decisões.',
    icon: ChartColumnBig,
  },
  {
    title: 'CONTROLE DE CAIXA',
    description: 'Saiba exatamente quanto entrou e saiu.',
    icon: Wallet,
  },
  {
    title: 'GESTÃO MULTI-LOJA',
    description: 'Controle várias lojas no mesmo sistema.',
    icon: Building2,
  },
];

const powerItems = [
  'Quanto sua empresa vendeu hoje',
  'Qual produto vende mais',
  'Qual vendedor vende mais',
  'Quais produtos estão acabando',
  'Quanto dinheiro entrou no caixa',
];

const roles = [
  {
    title: 'ADMINISTRADOR',
    description: 'Controle total da empresa.',
  },
  {
    title: 'GESTOR',
    description: 'Acompanha vendas, estoque e relatórios.',
  },
  {
    title: 'VENDEDOR',
    description: 'Realiza vendas no ponto de venda.',
  },
];

const plans = [
  {
    name: 'STARTER',
    description: 'Para pequenos negócios.',
    highlight: false,
  },
  {
    name: 'BUSINESS',
    description: 'Para empresas em crescimento.',
    highlight: true,
  },
  {
    name: 'ENTERPRISE',
    description: 'Para empresas com várias lojas.',
    highlight: false,
  },
];

const stats = [
  { label: 'Vendas do dia', value: '124.500 MT', tone: 'text-profit' },
  { label: 'Produtos em alerta', value: '18 itens', tone: 'text-warning' },
  { label: 'Caixa atualizado', value: '37.200 MT', tone: 'text-primary' },
];

const SalesLandingPage: React.FC = () => {
  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem]"
        style={{
          background:
            'radial-gradient(circle at top left, hsl(var(--primary) / 0.28), transparent 40%), radial-gradient(circle at top right, hsl(var(--accent) / 0.18), transparent 34%)',
        }}
      />

      <section className="relative border-b border-border/60">
        <div className="container grid gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div className="space-y-8">
            <div className="space-y-5">
              <Badge variant="secondary" className="rounded-full px-4 py-1 text-sm">
                Feito para lojas, supermercados, farmácias, armazéns e PME
              </Badge>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Controle toda sua empresa em um <span className="text-gradient-primary">único sistema</span>.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                O NAVANHULA POS ajuda empresários a controlar vendas, estoque, caixa e funcionários com simplicidade e
                segurança.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2 px-8">
                <Link to="/registrar">
                  COMEÇAR AGORA
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-8">
                <Link to="#como-funciona">VER COMO FUNCIONA</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-[1.5rem] border border-border bg-card/60 p-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{stat.label}</p>
                  <p className={`mt-3 text-2xl font-black ${stat.tone}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              className="absolute inset-0 rounded-[2rem] blur-3xl"
              style={{ background: 'radial-gradient(circle at center, hsl(var(--primary) / 0.25), transparent 65%)' }}
            />
            <div
              className="relative overflow-hidden rounded-[2rem] border border-border/80 p-4 shadow-2xl"
              style={{ backgroundImage: 'var(--gradient-dark)' }}
            >
              <div className="space-y-4 rounded-[1.5rem] border border-border/80 bg-background/80 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Painel NAVANHULA POS</p>
                    <p className="text-2xl font-bold">Seu negócio em tempo real</p>
                  </div>
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">Ao vivo</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Card className="rounded-[1.5rem] border-border bg-card/70 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Vendas do dia</p>
                        <p className="mt-2 text-3xl font-black text-gradient-success">124.500 MT</p>
                      </div>
                      <div className="rounded-2xl bg-profit/15 p-3 text-profit">
                        <Receipt className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-success">
                      <BadgeCheck className="h-4 w-4" />
                      42 vendas registadas hoje
                    </div>
                  </Card>

                  <Card className="rounded-[1.5rem] border-border bg-card/70 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Caixa</p>
                        <p className="mt-2 text-3xl font-black">37.200 MT</p>
                      </div>
                      <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                        <CreditCard className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="mt-4 rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                      Entradas e saídas organizadas automaticamente
                    </div>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <Card className="rounded-[1.5rem] border-border bg-card/70 p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="rounded-2xl bg-accent/10 p-3 text-accent">
                        <BarChart3 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">Relatórios claros</p>
                        <p className="text-sm text-muted-foreground">Saiba o que vender, comprar e corrigir</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[
                        ['Produto mais vendido', 'Arroz 25kg'],
                        ['Melhor vendedor', 'Maria Silva'],
                        ['Loja com melhor resultado', 'Matola'],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3 text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-semibold text-foreground">{value}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="rounded-[1.5rem] border-border bg-card/70 p-5">
                    <p className="text-sm text-muted-foreground">Estoque</p>
                    <div className="mt-4 space-y-3">
                      {[
                        ['Açúcar', 'Baixo'],
                        ['Óleo', 'Normal'],
                        ['Medicamentos', 'Alerta'],
                      ].map(([label, status]) => (
                        <div key={label} className="rounded-xl border border-border bg-background/70 px-4 py-3">
                          <p className="font-medium">{label}</p>
                          <p className="mt-1 text-sm text-muted-foreground">Status: {status}</p>
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

      <section className="container py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Problema</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Muitos negócios perdem dinheiro todos os dias.</h2>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              Quando tudo depende de cadernos, memória ou controlo manual, os erros aparecem e o lucro desaparece.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {problems.map((problem) => (
              <Card key={problem} className="rounded-[1.5rem] border-border bg-card/70 p-5">
                <p className="text-base font-semibold">{problem}</p>
              </Card>
            ))}
            <Card className="rounded-[1.5rem] border-border bg-secondary/70 p-5 md:col-span-2">
              <p className="text-xl font-bold">Sem controlo, o negócio cresce no escuro.</p>
            </Card>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="border-y border-border/60 bg-card/30">
        <div className="container grid gap-12 py-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-24">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Solução</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Agora imagine ter tudo sob controlo.</h2>
            <p className="text-lg leading-8 text-muted-foreground">
              O NAVANHULA POS reúne vendas, caixa, estoque, equipa e relatórios num único lugar para você gerir com mais
              confiança todos os dias.
            </p>
            <Button asChild size="lg" className="px-8">
              <Link to="/registrar">Criar conta</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {solutions.map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-border bg-background/70 p-5">
                <CheckCircle2 className="mb-3 h-6 w-6 text-success" />
                <p className="font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16 lg:py-24">
        <div className="mb-8 max-w-2xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Funcionalidades</p>
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Tudo o que o empresário precisa para gerir melhor.</h2>
          <p className="text-lg leading-8 text-muted-foreground">
            Cada módulo foi pensado para ajudar você a vender mais, perder menos e decidir com clareza.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="rounded-[1.75rem] border-border bg-card/70 p-6">
                <div className="mb-5 inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-black tracking-tight">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-y border-border/60">
        <div className="container grid gap-10 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-24">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Poder para o empresário</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Informação é poder.</h2>
            <p className="text-lg leading-8 text-muted-foreground">
              Com o NAVANHULA POS você pode descobrir agora o que está a acontecer no seu negócio e agir no momento certo.
            </p>
            <p className="text-base leading-7 text-muted-foreground">
              Isso permite tomar decisões inteligentes todos os dias.
            </p>
          </div>

          <Card className="rounded-[2rem] border-border bg-card/70 p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {powerItems.map((item) => (
                <div key={item} className="rounded-2xl bg-background/70 px-4 py-4">
                  <p className="font-semibold">{item}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="container py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Segurança e acesso</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Cada pessoa vê apenas o que precisa.</h2>
            <p className="text-lg leading-8 text-muted-foreground">
              Proteja a operação da empresa com acessos organizados por função e mantenha mais controlo sobre o dia a dia.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {roles.map((role) => (
              <Card key={role.title} className="rounded-[1.75rem] border-border bg-card/70 p-6">
                <div className="mb-4 inline-flex rounded-2xl bg-accent/10 p-3 text-accent">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black tracking-tight">{role.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{role.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="container py-16 lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-6 inline-flex rounded-full bg-success/10 p-3 text-success">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Confiança para crescer com organização.</h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              O NAVANHULA POS foi criado para ajudar empresas a crescer com organização, controlo e inteligência de negócio.
            </p>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Cada venda, cada produto e cada movimento da empresa fica registado no sistema.
            </p>
          </div>
        </div>
      </section>

      <section className="container py-16 lg:py-24">
        <div className="mb-8 max-w-2xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Planos</p>
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Escolha o plano certo para o momento da sua empresa.</h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className="rounded-[2rem] border-border bg-card/70 p-6"
              style={plan.highlight ? { boxShadow: 'var(--shadow-glow)' } : undefined}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{plan.name}</p>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">{plan.description}</p>
              <Button asChild className="mt-8 w-full" variant={plan.highlight ? 'default' : 'outline'}>
                <Link to="/registrar">COMEÇAR AGORA</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section className="pb-16 lg:pb-24">
        <div className="container">
          <div
            className="overflow-hidden rounded-[2rem] border border-border px-6 py-10 text-center sm:px-10 lg:px-16 lg:py-14"
            style={{ backgroundImage: 'var(--gradient-dark)' }}
          >
            <div className="mx-auto max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Pronto para começar?</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Empresas organizadas crescem mais rápido.
              </h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                Se você quer controlar seu negócio, aumentar seus lucros e tomar decisões com confiança, o NAVANHULA POS é a solução.
              </p>
              <Button asChild size="lg" className="mt-8 px-10">
                <Link to="/registrar">COMEÇAR AGORA</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-card/40">
        <div className="container flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-black tracking-tight">NAVANHULA POS</p>
            <p className="mt-2 text-sm text-muted-foreground">Tecnologia para empresas que querem crescer.</p>
          </div>

          <nav className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link to="/sobre" className="transition-colors hover:text-foreground">
              Sobre
            </Link>
            <Link to="/precos" className="transition-colors hover:text-foreground">
              Preços
            </Link>
            <Link to="/recursos" className="transition-colors hover:text-foreground">
              Recursos
            </Link>
            <Link to="/contato" className="transition-colors hover:text-foreground">
              Contato
            </Link>
          </nav>

          <div className="hidden rounded-full bg-primary/10 p-3 text-primary md:flex">
            <Store className="h-5 w-5" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SalesLandingPage;
