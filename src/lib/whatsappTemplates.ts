// WhatsApp message templates for automated sales flows

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'welcome' | 'sales' | 'followup' | 'delivery' | 'promo' | 'support';
  message: string;
  variables: string[];
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'welcome',
    name: 'Boas-vindas',
    category: 'welcome',
    message: `Olá 👋 *{{nome}}*, bem-vindo ao *NAVANHULA CLOUD*!

Posso ajudar com:
1️⃣ *Comprar* frango
2️⃣ *Vender* (sou criador)
3️⃣ *Entregas* (sou motorista)

Responda com o número da opção desejada.`,
    variables: ['nome'],
  },
  {
    id: 'buyer_products',
    name: 'Produtos Disponíveis',
    category: 'sales',
    message: `🐔 *Produtos disponíveis hoje:*

{{lista_produtos}}

📦 Entrega disponível na sua região.
💰 Pagamento via M-Pesa, e-Mola ou dinheiro.

👉 Responda com o número do produto para fazer pedido.`,
    variables: ['lista_produtos'],
  },
  {
    id: 'order_confirm',
    name: 'Confirmação de Pedido',
    category: 'sales',
    message: `✅ *Pedido confirmado!*

📋 Pedido: #{{pedido_id}}
🐔 Produto: {{produto}}
📦 Quantidade: {{quantidade}}
💰 Total: {{total}}

🚚 Entrega prevista: {{data_entrega}}

Obrigado pela confiança! 🙏`,
    variables: ['pedido_id', 'produto', 'quantidade', 'total', 'data_entrega'],
  },
  {
    id: 'seller_register',
    name: 'Registo de Criador',
    category: 'sales',
    message: `🌾 *Registo de Criador*

Precisamos de alguns dados:
📝 Nome da granja
📍 Localização (província/distrito)
📱 Telefone de contacto
🐔 Tipo de produção
📦 Capacidade estimada

Envie os dados e vamos cadastrá-lo no sistema!`,
    variables: [],
  },
  {
    id: 'promo_urgency',
    name: 'Promoção Urgente',
    category: 'promo',
    message: `🔥 *Oferta Especial!*

{{produto}} disponível por apenas *{{preco}}*!

⚡ Últimas {{quantidade}} unidades
⏰ Oferta válida até {{validade}}

👉 Responda "QUERO" para reservar agora!`,
    variables: ['produto', 'preco', 'quantidade', 'validade'],
  },
  {
    id: 'followup_cold',
    name: 'Follow-up Lead Frio',
    category: 'followup',
    message: `Olá {{nome}} 👋

Notámos que ainda não finalizou sua compra.

🐔 Temos frango fresco disponível hoje!
💰 Preços competitivos
🚚 Entrega rápida

Posso ajudar com algo? 😊`,
    variables: ['nome'],
  },
  {
    id: 'followup_cart',
    name: 'Carrinho Abandonado',
    category: 'followup',
    message: `Olá {{nome}}! 🛒

Seu pedido de *{{produto}}* ainda está disponível.

💰 Total: {{total}}
🚚 Entrega em até 24h

Deseja finalizar? Responda "SIM" para confirmar.`,
    variables: ['nome', 'produto', 'total'],
  },
  {
    id: 'delivery_update',
    name: 'Atualização de Entrega',
    category: 'delivery',
    message: `📦 *Atualização do Pedido #{{pedido_id}}*

Status: {{status}}
🚚 Motorista: {{motorista}}
📱 Contacto: {{telefone_motorista}}

{{mensagem_extra}}`,
    variables: ['pedido_id', 'status', 'motorista', 'telefone_motorista', 'mensagem_extra'],
  },
  {
    id: 'producer_notify',
    name: 'Notificar Produtor',
    category: 'sales',
    message: `📢 *Novo Pedido!*

🐔 Produto: {{produto}}
📦 Quantidade: {{quantidade}}
💰 Valor: {{valor}}
👤 Cliente: {{cliente}}

⏰ Preparar para entrega: {{data_entrega}}

Confirme respondendo "OK".`,
    variables: ['produto', 'quantidade', 'valor', 'cliente', 'data_entrega'],
  },
  {
    id: 'weekly_summary',
    name: 'Resumo Semanal',
    category: 'support',
    message: `📊 *Resumo Semanal — NAVANHULA CLOUD*

📅 Período: {{periodo}}
💰 Vendas: {{total_vendas}}
📦 Pedidos: {{num_pedidos}}
🐔 Produtos vendidos: {{produtos_vendidos}}

🔝 Produto mais vendido: {{top_produto}}

Continue crescendo! 🚀`,
    variables: ['periodo', 'total_vendas', 'num_pedidos', 'produtos_vendidos', 'top_produto'],
  },
];

export type LeadStatus = 'hot' | 'warm' | 'cold';

export interface WhatsAppLead {
  id: string;
  name: string;
  phone: string;
  status: LeadStatus;
  lastContact: string;
  source: string;
  notes: string;
  messagesCount: number;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}

export function fillTemplate(template: WhatsAppTemplate, values: Record<string, string>): string {
  let msg = template.message;
  for (const [key, value] of Object.entries(values)) {
    msg = msg.split(`{{${key}}}`).join(value);
  }
  return msg;
}

export function getLeadStatusColor(status: LeadStatus): string {
  switch (status) {
    case 'hot': return 'text-destructive';
    case 'warm': return 'text-warning';
    case 'cold': return 'text-muted-foreground';
  }
}

export function getLeadStatusLabel(status: LeadStatus): string {
  switch (status) {
    case 'hot': return '🔥 Quente';
    case 'warm': return '⚡ Morno';
    case 'cold': return '❄️ Frio';
  }
}
