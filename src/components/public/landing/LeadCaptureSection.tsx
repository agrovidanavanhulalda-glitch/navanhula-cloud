import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gift, Mail, User, Phone, CheckCircle2, Loader2 } from 'lucide-react';
import SectionHeading from '@/components/public/SectionHeading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const offers = [
  '14 dias de teste grátis',
  'Sem cartão de crédito',
  'Configuração em 5 minutos',
  'Suporte dedicado incluído',
];

const LeadCaptureSection: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Preencha nome e email.');
      return;
    }
    setLoading(true);
    // Simulate lead capture — in production this would save to database
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
    toast.success('Obrigado! Vamos entrar em contacto.');
  };

  return (
    <section id="teste-gratis" className="scroll-mt-28 border-y border-border/60 bg-card/30">
      <div className="container grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <div className="space-y-6">
          <SectionHeading
            eyebrow="Oferta especial"
            title="Teste grátis por 14 dias. Sem compromisso."
            description="Cadastre-se agora e receba acesso completo ao sistema. Sem limites, sem cartão de crédito."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {offers.map((o) => (
              <div key={o} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                <span>{o}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
            <Gift className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-bold">Bónus de registo</p>
              <p className="text-xs text-muted-foreground">
                Quem se registar esta semana recebe configuração gratuita assistida.
              </p>
            </div>
          </div>
        </div>

        <Card className="rounded-[2rem] border-border p-6 sm:p-8">
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="rounded-full bg-success/10 p-4">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              <h3 className="text-xl font-bold">Registo recebido!</h3>
              <p className="text-sm text-muted-foreground">
                Vamos entrar em contacto em breve. Enquanto isso, crie sua conta:
              </p>
              <Button asChild size="lg" className="mt-2 gap-2">
                <Link to="/registrar">
                  CRIAR CONTA AGORA <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center">
                <h3 className="text-xl font-bold">Comece seu teste grátis</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Preencha abaixo e tenha acesso imediato.
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Seu melhor email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="Telefone (opcional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full gap-2 text-base font-bold" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  <>COMEÇAR TESTE GRÁTIS <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Ao continuar, você concorda com os nossos termos de serviço.
              </p>
            </form>
          )}
        </Card>
      </div>
    </section>
  );
};

export default LeadCaptureSection;
