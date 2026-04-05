// Plan tier definitions for NAVANHULA CLOUD monetization

export type PlanTier = 'starter' | 'pro' | 'enterprise';

export interface PlanFeature {
  key: string;
  label: string;
  starter: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
}

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  price: number; // MT/month per store
  yearlyPrice: number; // MT/year per store (with discount)
  description: string;
  badge?: string;
  maxProducts: number;
  maxSellers: number;
  maxStores: number;
  features: string[];
}

export const PLANS: PlanDefinition[] = [
  {
    tier: 'starter',
    name: 'Starter',
    price: 750,
    yearlyPrice: 7500, // ~17% discount
    description: 'Ideal para pequenos negócios que estão a começar',
    maxProducts: 100,
    maxSellers: 2,
    maxStores: 1,
    features: [
      'PDV completo',
      'Gestão de estoque básica',
      'Até 100 produtos',
      'Até 2 vendedores',
      '1 loja',
      'Relatórios básicos',
      'Suporte por email',
    ],
  },
  {
    tier: 'pro',
    name: 'Profissional',
    price: 1500,
    yearlyPrice: 15000, // ~17% discount
    description: 'Para negócios em crescimento que precisam de mais poder',
    badge: 'Mais Popular',
    maxProducts: 1000,
    maxSellers: 10,
    maxStores: 5,
    features: [
      'Tudo do Starter +',
      'Até 1.000 produtos',
      'Até 10 vendedores',
      'Até 5 lojas',
      'Relatórios avançados',
      'CRM e fidelização',
      'Documentos fiscais',
      'Comissões automáticas',
      'Suporte prioritário',
    ],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 3500,
    yearlyPrice: 35000,
    description: 'Para grandes operações com múltiplas filiais',
    badge: 'Máximo Poder',
    maxProducts: -1, // unlimited
    maxSellers: -1,
    maxStores: -1,
    features: [
      'Tudo do Profissional +',
      'Produtos ilimitados',
      'Vendedores ilimitados',
      'Lojas ilimitadas',
      'IA para Insights de Negócio',
      'Dashboard CEO',
      'Motor de Compliance',
      'API personalizada',
      'Gerente de conta dedicado',
    ],
  },
];

export const FEATURE_MATRIX: PlanFeature[] = [
  { key: 'pos', label: 'PDV (Ponto de Venda)', starter: true, pro: true, enterprise: true },
  { key: 'products', label: 'Produtos', starter: 'Até 100', pro: 'Até 1.000', enterprise: 'Ilimitado' },
  { key: 'sellers', label: 'Vendedores', starter: 'Até 2', pro: 'Até 10', enterprise: 'Ilimitado' },
  { key: 'stores', label: 'Lojas', starter: '1', pro: 'Até 5', enterprise: 'Ilimitado' },
  { key: 'reports', label: 'Relatórios', starter: 'Básicos', pro: 'Avançados', enterprise: 'Completos + IA' },
  { key: 'crm', label: 'CRM & Fidelização', starter: false, pro: true, enterprise: true },
  { key: 'fiscal', label: 'Documentos Fiscais', starter: false, pro: true, enterprise: true },
  { key: 'hr', label: 'RH & Payroll', starter: false, pro: true, enterprise: true },
  { key: 'ai', label: 'Insights com IA', starter: false, pro: false, enterprise: true },
  { key: 'ceo', label: 'Dashboard CEO', starter: false, pro: false, enterprise: true },
  { key: 'compliance', label: 'Compliance & Auditoria', starter: false, pro: false, enterprise: true },
  { key: 'api', label: 'API Personalizada', starter: false, pro: false, enterprise: true },
  { key: 'support', label: 'Suporte', starter: 'Email', pro: 'Prioritário', enterprise: 'Dedicado' },
];

export function getPlanByTier(tier: PlanTier): PlanDefinition {
  return PLANS.find(p => p.tier === tier) || PLANS[1];
}

export function getYearlyDiscount(plan: PlanDefinition): number {
  const monthlyTotal = plan.price * 12;
  return Math.round(((monthlyTotal - plan.yearlyPrice) / monthlyTotal) * 100);
}
