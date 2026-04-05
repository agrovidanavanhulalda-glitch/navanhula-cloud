import React, { useEffect, useState } from 'react';
import { Store, ShoppingCart, Users, TrendingUp } from 'lucide-react';

interface CounterProps {
  end: number;
  suffix?: string;
  duration?: number;
}

const AnimatedCounter: React.FC<CounterProps> = ({ end, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);

  return <>{count.toLocaleString('pt-MZ')}{suffix}</>;
};

const stats = [
  { icon: Store, value: 50, suffix: '+', label: 'Lojas ativas' },
  { icon: ShoppingCart, value: 12400, suffix: '+', label: 'Vendas processadas' },
  { icon: Users, value: 200, suffix: '+', label: 'Utilizadores' },
  { icon: TrendingUp, value: 98, suffix: '%', label: 'Satisfação' },
];

const SocialProofBar: React.FC = () => (
  <section className="border-b border-border/60 bg-background">
    <div className="container py-8">
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight">
                <AnimatedCounter end={s.value} suffix={s.suffix} />
              </p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default SocialProofBar;
