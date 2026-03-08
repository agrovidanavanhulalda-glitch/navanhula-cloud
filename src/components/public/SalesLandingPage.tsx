import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  CirclePlay,
  CreditCard,
  FileSpreadsheet,
  Handshake,
  Landmark,
  LayoutDashboard,
  PackageCheck,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import SectionHeading from '@/components/public/SectionHeading';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const trustSegments = ['Lojas', 'Supermercados', 'Farmácias', 'PMEs'];

const heroBenefits = [
  'Registe vendas em segundos',
  'Controle seu estoque automaticamente',
  'Veja relatórios claros do seu negócio',
  'Gerencie múltiplas lojas',
];

const steps = [
  {
    title: 'Cadastre seus produtos',
    description: 'Adicione produtos e organize seu estoque facilmente.',
  },
  {
    title: 'Faça vendas rapidamente',
    description: 'Registe vendas no sistema POS de forma simples e rápida.',
  },
  {
    title: 'Controle seu negócio',
    description: 'Veja relatórios claros de vendas, caixa e desempenho.',
  },
];

const features = [
  {
    title: 'POS profissional de vendas',
    description: 'Atenda clientes com rapidez, recibos organizados e controlo total de cada venda.',
    icon: ShoppingCart,
  },
  {
    title: 'Gestão inteligente de estoque',
    description: 'Saiba o que entrou, saiu e quais produtos precisam de reposição.',
    icon: Boxes,
  },
  {
    title: 'Controle de caixa',
    description: 'Acompanhe entradas, saídas e fecho de caixa com mais segurança.',
    icon: Wallet,
  },
  {
    title: 'Relatórios de vendas',
    description: 'Veja resultados do dia, produtos mais vendidos e desempenho do negócio.',
    icon: BarChart3,
  },
  {
    title: 'Gestão de vendedores',
    description: 'Monitore produtividade, comissões e performance da equipa.',
    icon: Users,
  },
  {
    title: 'Controle de múltiplas lojas',
    description: 'Gerencie diferentes unidades num único painel centralizado.',
    icon: Building2,
  },
  {
    title: 'Financeiro integrado',
    description: 'Organize movimentos financeiros e acompanhe a saúde da empresa.',
    icon: Landmark,
  },
  {
    title: 'Emissão de documentos comerciais',
    description: 'Crie documentos de forma profissional para clientes e operações do dia a dia.',
    icon: FileSpreadsheet,
  },
  {
    title: 'Carteira digital',
    description: 'Acompanhe pagamentos e saldos com mais controlo e agilidade.',
    icon: CreditCard,
  },
  {
    title: 'Comunidade de empreendedores',
    description: 'Conecte-se com outros empresários e descubra novas oportunidades.',
    icon: Handshake,
  },
];

const benefits = [
  'Controle total da empresa',
  'Redução de erros nas vendas',
  'Estoque organizado',
  'Relatórios em tempo real',
  'Sistema acessível em qualquer lugar',
  'Crescimento estruturado do negócio',
];

const audiences = ['Lojas', 'Supermercados', 'Farmácias', 'Armazéns', 'Distribuidores', 'Pequenas e médias empresas'];

const dashboardStats = [
  { label: 'Vendas do dia', value: '124.500 MT', tone: 'text-profit' },
  { label: 'Caixa atual', value: '37.200 MT', tone: 'text-primary' },
  { label: 'Estoque crítico', value: '18 itens', tone: 'text-warning' },
];

const SalesLandingPage: React.FC = () => {
  return (
    <div id="top" className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[46rem]"
        style={{
          background:
            'radial-gradient(circle at top left, hsl(var(--primary) / 0.25), transparent 38%), radial-gradient(circle at top right, hsl(var(--accent) / 0.16), transparent 32%)',
        }}
      />

      <section className="relative border-b border-border/60">
        <div className="container grid gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div className="space-y-8">
            <div className="space-y-5">
              <Badge variant="secondary" className="rounded-full px-4 py-1 text-sm">
                Controle total do seu negócio em tempo real.
              </Badge>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Controle vendas, estoque e dinheiro da sua empresa em um <span className="text-gradient-primary">único sistema</span>.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                O NAVANHULA ERP é uma plataforma empresarial completa para lojas, supermercados, farmácias e empresas que precisam de
                controle total do negócio em tempo real.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {heroBenefits.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-[1.25rem] border border-border bg-card/60 px-4 py-3 backdrop-blur-sm">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="font-medium text-foreground">{item}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2 px-8">
                <Link to="/registrar">
                  COMEÇAR AGORA
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-8">
                <Link to={{ pathname: '/', hash: '#como-funciona' }}>VER COMO FUNCIONA</Link>
              </Button>
            </div>

            <div className="space-y-4 rounded-[1.75rem] border border-border bg-card/50 p-5 backdrop-blur-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Empresas usando o sistema</p>
              <div className="flex flex-wrap gap-3">
                {trustSegments.map((segment) => (
                  <div key={segment} className="rounded-full border border-border bg-background/70 px-4 py-2 text-sm font-medium text-foreground">
                    {segment}
                  </div>
                ))}
              </div>
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
                    <p className="text-sm text-muted-foreground">Painel NAVANHULA ERP</p>
                    <p className="text-2xl font-bold">Seu negócio em tempo real</p>
                  </div>
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">Ao vivo</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {dashboardStats.map((stat) => (
                    <Card key={stat.label} className="rounded-[1.4rem] border-border bg-card/70 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{stat.label}</p>
                      <p className={`mt-3 text-2xl font-black ${stat.tone}`}>{stat.value}</p>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <Card className="rounded-[1.5rem] border-border bg-card/70 p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                        <LayoutDashboard className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">Visão geral do negócio</p>
                        <p className="text-sm text-muted-foreground">Relatórios claros para decidir rápido</p>
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
                    <p className="text-sm text-muted-foreground">Estoque e operações</p>
                    <div className="mt-4 space-y-3">
                      {[
                        ['Açúcar', 'Baixo'],
                        ['Óleo', 'Normal'],
                        ['Medicamentos', 'Reposição'],
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

      <section id="sobre" className="container scroll-mt-28 py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <SectionHeading
            eyebrow="Sobre o sistema"
            title="Controle total do seu negócio em tempo real."
            description="O NAVANHULA ERP é uma plataforma inteligente que ajuda empresas a controlar vendas, estoque, caixa, contabilidade e relatórios em um único lugar."
          />

          <Card className="rounded-[2rem] border-border bg-card/60 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                'Mais controlo sobre vendas e caixa',
                'Menos erros no estoque e nas operações',
                'Mais clareza para decidir o próximo passo',
                'Mais confiança para crescer com organização',
              ].map((item) => (
                <div key={item} className="rounded-[1.25rem] border border-border bg-background/70 p-5">
                  <CheckCircle2 className="mb-3 h-5 w-5 text-success" />
                  <p className="font-semibold leading-7">{item}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-28 border-y border-border/60 bg-card/30">
        <div className="container py-16 lg:py-24">
          <SectionHeading
            eyebrow="Como funciona"
            title="Comece a usar em poucos minutos"
            description="Uma jornada simples para sair do controlo manual e começar a gerir sua empresa com mais confiança."
            className="max-w-3xl"
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {steps.map((step, index) => (
              <Card key={step.title} className="rounded-[1.75rem] border-border bg-card/70 p-6">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-lg font-black text-primary">
                  0{index + 1}
                </div>
                <h3 className="text-xl font-black tracking-tight">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="recursos" className="container scroll-mt-28 py-16 lg:py-24">
        <SectionHeading
          eyebrow="Recursos"
          title="Tudo que sua empresa precisa em um único sistema"
          description="Do atendimento no balcão até o controlo financeiro, cada recurso foi pensado para simplificar sua operação."
          className="max-w-3xl"
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

      <section className="border-y border-border/60 bg-card/30">
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
                  <h3 className="max-w-lg text-2xl font-black tracking-tight sm:text-3xl">Veja vendas, estoque, caixa e relatórios numa apresentação simples e objetiva.</h3>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="rounded-full border border-border bg-background/70 px-3 py-1">POS</span>
                    <span className="rounded-full border border-border bg-background/70 px-3 py-1">Estoque</span>
                    <span className="rounded-full border border-border bg-background/70 px-3 py-1">Financeiro</span>
                    <span className="rounded-full border border-border bg-background/70 px-3 py-1">Relatórios</span>
                  </div>
                </div>
              </div>
            </AspectRatio>
          </Card>
        </div>
      </section>

      <section className="container py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
          <SectionHeading
            eyebrow="Benefícios"
            title="Por que empresas escolhem o NAVANHULA ERP?"
            description="O sistema foi pensado para empresários que precisam de mais controlo, mais clareza e mais velocidade nas decisões."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {benefits.map((item) => (
              <Card key={item} className="rounded-[1.5rem] border-border bg-card/70 p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 text-primary" />
                  <p className="font-semibold leading-7">{item}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/60">
        <div className="container grid gap-10 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-24">
          <SectionHeading
            eyebrow="Para quem é"
            title="Feito para empresas que querem crescer"
            description="O NAVANHULA ERP atende operações de diferentes tamanhos, sempre com foco em simplicidade e controlo real do negócio."
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {audiences.map((item) => (
              <Card key={item} className="rounded-[1.5rem] border-border bg-card/70 p-5">
                <div className="mb-4 inline-flex rounded-2xl bg-accent/10 p-3 text-accent">
                  <Store className="h-5 w-5" />
                </div>
                <p className="font-semibold">{item}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="precos" className="container scroll-mt-28 py-16 lg:py-24">
        <SectionHeading
          eyebrow="Preços"
          title="Planos simples para empresas que querem crescer"
          description="Escolha uma solução pronta para organizar sua operação e acelerar o crescimento da empresa."
          className="mx-auto max-w-3xl text-center"
          align="center"
        />

        <div className="mx-auto mt-10 max-w-5xl">
          <Card className="overflow-hidden rounded-[2rem] border-border bg-card/70 p-0">
            <div className="grid gap-0 lg:grid-cols-[0.88fr_1.12fr]">
              <div className="border-b border-border p-8 lg:border-b-0 lg:border-r">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Plano único</p>
                <h3 className="mt-4 text-3xl font-black tracking-tight">NAVANHULA POS PROFISSIONAL</h3>
                <div className="mt-5 flex items-end gap-3">
                  <span className="text-5xl font-black tracking-tight">1500 MT</span>
                  <span className="pb-1 text-base text-muted-foreground">/ mês por loja ativa</span>
                </div>
                <p className="mt-4 text-base leading-8 text-muted-foreground">
                  Sem instalação complicada. Comece a controlar seu negócio em minutos.
                </p>
                <Button asChild size="lg" className="mt-8 px-8">
                  <Link to="/registrar">COMEÇAR TESTE GRÁTIS</Link>
                </Button>
                <p className="mt-3 text-sm text-muted-foreground">Teste gratuito disponível. Cancele quando quiser.</p>
              </div>
              <div className="p-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    'Sistema completo de vendas (POS)',
                    'Gestão de estoque',
                    'Relatórios financeiros',
                    'Gestão de funcionários',
                    'Emissão de documentos comerciais',
                    'Loja online integrada',
                    'Acesso multi-usuário',
                    'Suporte e atualizações',
                  ].map((item) => (
                    <div key={item} className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-4">
                      <div className="flex items-start gap-3">
                        <PackageCheck className="mt-1 h-5 w-5 text-success" />
                        <span className="font-medium leading-7">{item}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section id="contacto" className="scroll-mt-28 border-y border-border/60 bg-card/30">
        <div className="container grid gap-10 py-16 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:py-24">
          <SectionHeading
            eyebrow="Contacto"
            title="Precisa de ajuda para implementar o sistema?"
            description="Nossa equipa pode ajudar sua empresa a começar a usar o NAVANHULA POS com mais rapidez e segurança."
          />

          <Card className="rounded-[2rem] border-border bg-card/70 p-8">
            <p className="text-lg font-semibold leading-8">Fale com um especialista e descubra a melhor forma de aplicar o sistema no seu negócio.</p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Receba orientação para organizar produtos, vendas, caixa e operação diária sem complicação.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="px-8">
                <Link to="/contato">Falar com especialista</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-8">
                <Link to="/registrar">Criar conta</Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <section className="pb-16 pt-16 lg:pb-24">
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
    </div>
  );
};

export default SalesLandingPage;
