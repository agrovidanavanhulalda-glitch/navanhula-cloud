import React from 'react';
import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface Props { title: string; description?: string }

export const FounderComingSoonPage: React.FC<Props> = ({ title, description }) => (
  <Card className="p-10 text-center border-dashed">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold to-accent text-accent-foreground">
      <Sparkles className="h-6 w-6" />
    </div>
    <h2 className="text-xl font-black">{title}</h2>
    <p className="mt-2 text-sm text-muted-foreground">
      {description ?? 'Este módulo será entregue no próximo marco do Founder Control Center.'}
    </p>
  </Card>
);

export default FounderComingSoonPage;
