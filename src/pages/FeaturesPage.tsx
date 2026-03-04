import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, FileText, Package, ShoppingCart, Store, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const featureGroups = [
  {
    title: 'Operação diária',
    description: 'Dashboard, PDV, vendas, produtos e estoque com navegação clara para o utilizador final.',
    icon: ShoppingCart,
  },
  {
    title: 'Expansão comercial',
    description: 'Gestão de lojas, catálogo e relatórios para acompanhar crescimento e desempenho.',
    icon: Store,
  },
  {
    title: 'Controlo financeiro',
    description: 'Financeiro, carteira e indicadores para apoiar decisões e acompanhar resultados.',
    icon: WalletCards,
  },
  {
    title: 'Documentos comerciais',
    description: 'Cotações e outros documentos fiscais emitidos a partir do ambiente privado da empresa.',
    icon: FileText,
  },
  {
    title: 'Inteligência operacional',
    description: 'Relatórios e visão consolidada para transformar dados de venda em ação.',
    icon: BarChart3,
  },
  {
    title: 'Estrutura pronta para catálogo',
    description: 'Produtos, imagens, preços e stock centralizados para operação consistente.',
    icon: Package,
  },
];

const FeaturesPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Recursos | NAVANHULA POS';
  }, []);

  return (
    <div className="container space-y-14 py-16 lg:py-20">
      <section className="max-w-3xl space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Recursos</p>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Tudo o que o cliente precisa para entrar, operar e crescer.</h1>
        <p className="text-lg leading-8 text-muted-foreground">
          O NAVANHULA POS foi organizado para separar bem o que é apresentação pública do que é execução privada, sem confusão na navegação.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {featureGroups.map((group) => {
          const Icon = group.icon;
          return (
            <Card key={group.title} className="rounded-[1.75rem] border-border bg-card/70 p-6">
              <div className="mb-5 inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold">{group.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{group.description}</p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-border bg-background/60 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Fluxo público</p>
          <h2 className="mt-3 text-2xl font-bold">Visitantes navegam livremente.</h2>
          <p className="mt-3 text-muted-foreground">
            As páginas Home, Sobre, Preços, Recursos e Contacto estão acessíveis sem login para apresentar o produto e converter interesse.
          </p>
        </div>
        <div className="rounded-[2rem] border border-border bg-card/60 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Fluxo privado</p>
          <h2 className="mt-3 text-2xl font-bold">Clientes entram em `/app/dashboard`.</h2>
          <p className="mt-3 text-muted-foreground">
            Depois da autenticação, a navegação passa para o app real com módulos protegidos e conteúdo focado no utilizador final.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card/40 p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Quer ver estes recursos em ação?</h2>
            <p className="mt-2 text-muted-foreground">Abra a sua conta e entre diretamente no painel privado.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/registrar">Criar conta</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Já tenho conta</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FeaturesPage;
