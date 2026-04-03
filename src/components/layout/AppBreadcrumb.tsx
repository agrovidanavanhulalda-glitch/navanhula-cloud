import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const routeLabels: Record<string, string> = {
  app: 'Início',
  dashboard: 'Dashboard',
  ceo: 'Painel CEO',
  pdv: 'PDV',
  caixa: 'Caixa',
  vendas: 'Histórico de Vendas',
  ecommerce: 'Loja Online',
  produtos: 'Produtos',
  estoque: 'Estoque',
  rh: 'Recursos Humanos',
  vendedores: 'Vendedores',
  contabilidade: 'Contabilidade',
  financeiro: 'Financeiro',
  fiscal: 'Fiscal',
  carteira: 'Carteira',
  'pagamentos-manuais': 'Pagamentos MM',
  documentos: 'Documentos',
  bi: 'BI Analytics',
  ai: 'AI Engine',
  crm: 'Clientes',
  fornecedores: 'Fornecedores',
  lojas: 'Lojas',
  agricultura: 'Agricultura',
  avicultura: 'Avicultura',
  inteligencia: 'Inteligência Avícola',
  ambiente: 'Ambiente & Clima',
  assinatura: 'Assinatura',
  configuracoes: 'Configurações',
  comunidade: 'Comunidade',
  relatorios: 'Relatórios',
  revendedores: 'Revendedores',
  cadastrar: 'Cadastrar',
  lista: 'Lista',
  comissoes: 'Comissões',
  pagamentos: 'Pagamentos',
  links: 'Links',
  performance: 'Performance',
  materiais: 'Materiais',
  criadores: 'Criadores',
};

const AppBreadcrumb: React.FC = () => {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  // Skip if we're at root /app or /app/dashboard
  if (segments.length <= 2 && segments[1] === 'dashboard') return null;

  const crumbs = segments.slice(1); // remove "app"

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/app/dashboard">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {crumbs.map((segment, idx) => {
          const path = '/app/' + crumbs.slice(0, idx + 1).join('/');
          const label = routeLabels[segment] || segment;
          const isLast = idx === crumbs.length - 1;

          return (
            <React.Fragment key={path}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={path}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default AppBreadcrumb;
