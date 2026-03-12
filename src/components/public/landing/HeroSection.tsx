import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, CheckCircle2, BarChart3, ShoppingCart, Users, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const stats = [
  { value: '124.500 MT', label: 'Vendas do dia', tone: 'text-profit' },
  { value: '37.200 MT', label: 'Caixa atual', tone: 'text-primary' },
  { value: '18 itens', label: 'Estoque crítico', tone: 'text-warning' },
];

const miniFeatures = [
  { icon: ShoppingCart, label: 'POS rápido' },
  { icon: BarChart3, label: 'Relatórios' },
  { icon: Users, label: 'Clientes' },
  { icon: Store, label: 'Multi-loja' },
];

const HeroSection: React.FC = () => (
  <section className="relative overflow-hidden border-b border-border/60">
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 20% 0%, hsl(var(--primary) / 0.18), transparent 50%), radial-gradient(ellipse 60% 50% at 80% 10%, hsl(var(--accent) / 0.14), transparent 50%)',
      }}
    />

    <div className="container relative grid gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
      {/* Copy */}
      <div className="space-y-8">
        <Badge variant="secondary" className="rounded-full px-4 py-1.5 text-sm font-semibold">
          🚀 Usado por lojas, supermercados e PMEs em Moçambique
        </Badge>

        <h1 className="max-w-[640px] text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]">
          O ERP inteligente que ajuda sua loja a vender mais e controlar tudo em um{' '}
          <span className="text-gradient-primary">só lugar</span>.
        </h1>

        <p className="max-w-xl text-lg leading-8 text-muted-foreground">
          Gestão completa de vendas, produtos, clientes e relatórios em uma plataforma simples e poderosa.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="gap-2 px-8 text-base font-bold shadow-lg">
            <Link to="/registrar">
              COMEÇAR TESTE GRÁTIS
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2 px-8 text-base">
            <Link to={{ pathname: '/', hash: '#demo' }}>
              <Play className="h-4 w-4" />
              VER DEMONSTRAÇÃO
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Sem cartão de crédito</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Cancele quando quiser</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Funciona no celular</span>
        </div>
      </div>

      {/* Dashboard Preview */}
      <div className="relative">
        <div
          className="absolute -inset-4 rounded-[2.5rem] blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.2), transparent 70%)' }}
        />
        <Card className="relative overflow-hidden rounded-[2rem] border-border/80 p-4 shadow-2xl" style={{ backgroundImage: 'var(--gradient-dark)' }}>
          <div className="space-y-4 rounded-[1.5rem] border border-border/60 bg-background/90 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Painel NAVANHULA ERP</p>
                <p className="text-xl font-bold">Seu negócio em tempo real</p>
              </div>
              <Badge className="rounded-full bg-success/10 text-success border-success/20">● Ao vivo</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {stats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-card/70 p-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
                  <p className={`mt-2 text-2xl font-black ${s.tone}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {miniFeatures.map((f) => (
                <div key={f.label} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/40 p-3 text-center">
                  <f.icon className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  </section>
);

export default HeroSection;
