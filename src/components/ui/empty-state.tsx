import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
      <Icon className="w-8 h-8 text-muted-foreground/60" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-1.5">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
    {action && (
      <Button onClick={action.onClick} size="sm" className="gap-2">
        {action.label}
      </Button>
    )}
  </div>
);
