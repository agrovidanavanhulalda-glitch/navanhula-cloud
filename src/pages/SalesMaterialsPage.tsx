import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Image, MessageSquare, Rocket, BookOpen, Presentation,
  Download, ExternalLink, Copy, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const materials = [
  {
    title: 'Apresentação do NAVANHULA POS',
    description: 'Apresentação completa do sistema para mostrar a potenciais clientes. Inclui funcionalidades, benefícios e diferenciais.',
    icon: Presentation,
    type: 'Apresentação',
    content: `NAVANHULA POS - Sistema de Gestão Empresarial

✅ Sistema POS completo e profissional
✅ Gestão de estoque em tempo real
✅ Controlo financeiro automatizado
✅ Documentos fiscais (Cotações, Proformas, Faturas)
✅ Multi-empresa e multi-loja
✅ Dashboard executivo com KPIs
✅ Relatórios detalhados
✅ Pagamentos M-Pesa e e-Mola
✅ Sistema 100% online, sem instalação
✅ Suporte técnico dedicado

Preço: 1.500 MT/mês por loja
Teste grátis: 7 dias com acesso total`,
  },
  {
    title: 'Benefícios do Sistema',
    description: 'Lista de benefícios para convencer clientes. Ideal para conversas, WhatsApp e redes sociais.',
    icon: CheckCircle2,
    type: 'Texto de Venda',
    content: `🚀 POR QUE ESCOLHER O NAVANHULA POS?

💰 Aumente as suas vendas com controlo total do negócio
📊 Veja relatórios em tempo real de qualquer lugar
📦 Nunca mais perca vendas por falta de estoque
🧾 Emita faturas e recibos profissionais em segundos
👥 Gerencie vendedores e comissões automaticamente
🏪 Controle múltiplas lojas num só sistema
📱 Funciona no computador, tablet e celular
🔒 Dados seguros na nuvem com backup automático
💳 Aceite pagamentos M-Pesa e e-Mola
📈 Painel CEO para decisões estratégicas

✨ Comece GRÁTIS por 7 dias!
🔗 Registre-se em navanhula-pos-sync.lovable.app/registrar`,
  },
  {
    title: 'Guia Rápido do Produto',
    description: 'Passo a passo simplificado para novos clientes começarem a usar o sistema imediatamente.',
    icon: BookOpen,
    type: 'Guia',
    content: `GUIA RÁPIDO - NAVANHULA POS

1️⃣ CADASTRO
• Acesse o site e clique em "Criar Conta"
• Preencha nome, email e senha
• Confirme o email recebido

2️⃣ CONFIGURAÇÃO INICIAL
• O sistema cria automaticamente sua empresa e loja
• Acesse Configurações para personalizar dados da empresa
• Adicione o logo, NUIT e contactos

3️⃣ PRODUTOS
• Vá em Produtos → Novo Produto
• Cadastre nome, preço de custo e preço de venda
• Defina o estoque inicial

4️⃣ PRIMEIRA VENDA
• Abra o Caixa (obrigatório)
• Selecione um vendedor
• Acesse o PDV e adicione produtos
• Finalize a venda com o método de pagamento

5️⃣ RELATÓRIOS
• Dashboard mostra vendas e lucro do dia
• Relatórios detalhados por período
• Exportação em PDF e Excel`,
  },
  {
    title: 'Textos para WhatsApp',
    description: 'Mensagens prontas para enviar pelo WhatsApp a potenciais clientes.',
    icon: MessageSquare,
    type: 'Texto de Venda',
    content: `📱 MENSAGEM 1 - Primeira abordagem:

Olá! 👋
Você tem um negócio e ainda controla vendas no caderno ou Excel?

O NAVANHULA POS é um sistema profissional de gestão que te ajuda a:
✅ Registrar vendas rapidamente
✅ Controlar estoque automaticamente  
✅ Emitir faturas e recibos
✅ Ver relatórios do seu negócio

Pode testar GRÁTIS por 7 dias! Quer saber mais?

---

📱 MENSAGEM 2 - Follow-up:

Bom dia! 😊
Lembra que falei do NAVANHULA POS? 

Já são mais de X empresas usando o sistema em Moçambique. O preço é apenas 1.500 MT/mês por loja.

Posso te ajudar a criar a conta agora mesmo! É muito simples.`,
  },
  {
    title: 'Proposta de Valor',
    description: 'Texto formal para apresentações a empresas maiores ou licitações.',
    icon: FileText,
    type: 'Proposta',
    content: `PROPOSTA COMERCIAL - NAVANHULA POS
Sistema de Gestão Empresarial

SOBRE A SOLUÇÃO:
O NAVANHULA POS é uma plataforma SaaS de gestão empresarial desenvolvida para o mercado moçambicano, oferecendo controlo completo de operações comerciais, financeiras e fiscais.

MÓDULOS INCLUSOS:
• Ponto de Venda (PDV) profissional
• Gestão de Estoque e Produtos
• Contabilidade e Livro Caixa automáticos
• Documentos Fiscais (conformidade AT)
• CRM e gestão de clientes
• Dashboard executivo com BI
• Gestão de múltiplas lojas
• Integração M-Pesa e e-Mola

INVESTIMENTO:
• 1.500 MT/mês por loja ativa
• Sem custo de instalação
• Sem contrato de fidelidade
• Teste gratuito de 7 dias
• Suporte técnico incluído

CONTACTO:
www.navanhula.com
NAVANHULA GROUP LDA`,
  },
];

const SalesMaterialsPage: React.FC = () => {
  const handleCopy = (content: string, title: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`"${title}" copiado para a área de transferência`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Materiais de Venda</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recursos prontos para promover o NAVANHULA POS junto a potenciais clientes
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {materials.map((material, index) => (
          <Card key={index} className="flex flex-col hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <material.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{material.title}</CardTitle>
                    <Badge variant="secondary" className="mt-1 text-xs">{material.type}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">{material.description}</p>
              <div className="mt-auto">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => handleCopy(material.content, material.title)}
                >
                  <Copy className="w-4 h-4" />
                  Copiar Conteúdo
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-6 text-center">
          <Rocket className="w-8 h-8 text-primary mx-auto mb-3" />
          <p className="font-medium">Link de registro para clientes</p>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            Partilhe este link para os clientes se registrarem diretamente
          </p>
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/registrar`);
              toast.success('Link de registro copiado!');
            }}
          >
            <Copy className="w-4 h-4" />
            Copiar Link de Registro
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesMaterialsPage;
