import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, X, Crown, Zap, Building2 } from 'lucide-react';
import { PLANS, FEATURE_MATRIX, getYearlyDiscount, type PlanTier } from '@/lib/plans';
import { formatCurrency } from '@/lib/formatters';

interface PlanSelectorProps {
  currentTier?: PlanTier;
  onSelect: (tier: PlanTier, yearly: boolean) => void;
}

const tierIcons: Record<PlanTier, React.ElementType> = {
  starter: Zap,
  pro: Crown,
  enterprise: Building2,
};

const PlanSelector: React.FC<PlanSelectorProps> = ({ currentTier = 'pro', onSelect }) => {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="space-y-6">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${!yearly ? 'text-foreground' : 'text-muted-foreground'}`}>Mensal</span>
        <Switch checked={yearly} onCheckedChange={setYearly} />
        <span className={`text-sm font-medium ${yearly ? 'text-foreground' : 'text-muted-foreground'}`}>
          Anual
        </span>
        {yearly && (
          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
            Poupe até 17%
          </Badge>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const Icon = tierIcons[plan.tier];
          const isCurrent = plan.tier === currentTier;
          const discount = getYearlyDiscount(plan);
          const displayPrice = yearly ? Math.round(plan.yearlyPrice / 12) : plan.price;

          return (
            <Card
              key={plan.tier}
              className={`relative transition-all ${
                plan.badge ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-border'
              } ${isCurrent ? 'bg-primary/5' : ''}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground text-xs px-3">{plan.badge}</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2 pt-6">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div>
                  <span className="text-3xl font-black text-foreground">
                    {formatCurrency(displayPrice)}
                  </span>
                  <span className="text-sm text-muted-foreground"> /loja/mês</span>
                  {yearly && (
                    <p className="text-xs text-primary font-medium mt-1">
                      {formatCurrency(plan.yearlyPrice)} /ano ({discount}% desconto)
                    </p>
                  )}
                </div>

                <ul className="text-left space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : plan.badge ? 'default' : 'outline'}
                  disabled={isCurrent}
                  onClick={() => onSelect(plan.tier, yearly)}
                >
                  {isCurrent ? 'Plano Atual' : 'Selecionar'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feature comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparação Detalhada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Funcionalidade</th>
                  <th className="text-center py-2 px-3 font-medium">Starter</th>
                  <th className="text-center py-2 px-3 font-medium text-primary">Profissional</th>
                  <th className="text-center py-2 px-3 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_MATRIX.map((f) => (
                  <tr key={f.key} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-muted-foreground">{f.label}</td>
                    {(['starter', 'pro', 'enterprise'] as const).map((tier) => {
                      const val = f[tier];
                      return (
                        <td key={tier} className="text-center py-2 px-3">
                          {val === true ? (
                            <Check className="w-4 h-4 text-primary mx-auto" />
                          ) : val === false ? (
                            <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                          ) : (
                            <span className="text-xs font-medium">{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanSelector;
