import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ArrowRight, Sparkles, ShoppingBag, Wallet, Receipt, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SmartOnboarding: React.FC = () => {
  const { 
    first_product_added, 
    first_cash_opened, 
    first_sale_completed, 
    completionPct, 
    loading 
  } = useOnboarding();
  
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show welcome if nothing is done yet and it hasn't been shown this session
    const hasBeenShown = sessionStorage.getItem('onboarding_welcome_shown');
    if (!loading && !first_product_added && !first_cash_opened && !first_sale_completed && !hasBeenShown) {
      setShowWelcome(true);
      sessionStorage.setItem('onboarding_welcome_shown', 'true');
    }
  }, [loading, first_product_added, first_cash_opened, first_sale_completed]);

  if (loading || dismissed || completionPct === 100) return null;

  const steps = [
    {
      id: 'product',
      title: 'Criar primeiro produto',
      done: first_product_added,
      icon: <ShoppingBag className="w-5 h-5" />,
      route: '/app/produtos'
    },
    {
      id: 'cash',
      title: 'Abrir caixa',
      done: first_cash_opened,
      icon: <Wallet className="w-5 h-5" />,
      route: '/app/caixa'
    },
    {
      id: 'sale',
      title: 'Fazer primeira venda',
      done: first_sale_completed,
      icon: <Receipt className="w-5 h-5" />,
      route: '/app/pdv'
    }
  ];

  return (
    <>
      {/* Welcome Overlay */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="max-w-md w-full"
            >
              <Card className="p-8 text-center border-primary/20 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-400 to-primary" />
                
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                </div>
                
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Bem-vindo ao NAVANHULA CLOUD 👋
                </h2>
                <p className="text-muted-foreground mb-8">
                  Vamos configurar sua empresa em menos de 2 minutos. Siga os passos guiados para começar a operar.
                </p>
                
                <Button 
                  className="w-full h-12 text-lg font-medium group" 
                  onClick={() => setShowWelcome(false)}
                >
                  Começar Agora
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Progress Card (Pinned to Top or Sidebar) */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-6"
      >
        <Card className="p-4 border-primary/20 bg-primary/[0.02] shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Configuração Rápida</h3>
                <p className="text-[10px] text-muted-foreground">Complete para liberar todas as funções</p>
              </div>
            </div>
            <button 
              onClick={() => setDismissed(true)} 
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-[11px] font-medium mb-1">
              <span className="text-muted-foreground">Progresso</span>
              <span className="text-primary">{Math.round(completionPct)}%</span>
            </div>
            <Progress value={completionPct} className="h-1.5" />
            
            <div className="grid grid-cols-3 gap-2 mt-4">
              {steps.map((step, idx) => (
                <div 
                  key={step.id}
                  onClick={() => !step.done && navigate(step.route)}
                  className={`flex flex-col items-center p-2 rounded-lg border transition-all cursor-pointer ${
                    step.done 
                    ? 'bg-success/5 border-success/20 opacity-70' 
                    : 'bg-background border-border hover:border-primary/50 hover:shadow-md'
                  }`}
                >
                  <div className={`mb-2 ${step.done ? 'text-success' : 'text-muted-foreground'}`}>
                    {step.done ? <CheckCircle2 className="w-4 h-4" /> : step.icon}
                  </div>
                  <span className={`text-[9px] font-semibold text-center leading-tight ${step.done ? 'text-success' : 'text-foreground'}`}>
                    {step.title.split(' ').pop()}
                  </span>
                </div>
              ))}
            </div>

            {completionPct === 100 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 p-2 bg-success/10 border border-success/20 rounded-lg text-center"
              >
                <p className="text-[11px] font-bold text-success">
                  🎉 Sistema pronto. Você já pode operar normalmente.
                </p>
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>
    </>
  );
};

export default SmartOnboarding;
