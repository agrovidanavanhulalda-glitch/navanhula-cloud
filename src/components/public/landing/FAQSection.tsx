import React from 'react';
import SectionHeading from '@/components/public/SectionHeading';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  { q: 'O sistema funciona no celular?', a: 'Sim. O NAVANHULA CLOUD adapta automaticamente para celular, tablet e computador. Pode usá-lo de qualquer dispositivo com navegador.' },
  { q: 'Preciso instalar algo?', a: 'Não. O sistema funciona diretamente no navegador. Basta aceder ao site, fazer login e começar a usar.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim. A assinatura pode ser cancelada a qualquer momento, sem multas ou compromissos.' },
  { q: 'Posso gerir mais de uma loja?', a: 'Sim. O sistema suporta múltiplas lojas com dashboards e relatórios independentes para cada uma.' },
  { q: 'Os meus dados estão seguros?', a: 'Sim. Utilizamos criptografia, autenticação segura e isolamento de dados entre lojas para garantir total segurança.' },
  { q: 'Existe período de teste gratuito?', a: 'Sim. Pode criar uma conta e experimentar o sistema gratuitamente antes de assinar um plano.' },
];

const FAQSection: React.FC = () => (
  <section id="faq" className="scroll-mt-28">
    <div className="container py-16 lg:py-24">
      <SectionHeading
        eyebrow="FAQ"
        title="Perguntas frequentes"
        description="Respostas rápidas para as dúvidas mais comuns."
        align="center"
        className="mx-auto max-w-3xl"
      />

      <div className="mx-auto mt-10 max-w-2xl">
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="rounded-2xl border border-border bg-card/70 px-5">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-7 text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  </section>
);

export default FAQSection;
