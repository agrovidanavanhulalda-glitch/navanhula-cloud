import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  metric: React.ReactNode;
  unit?: string;
  description?: string;
  icon?: LucideIcon;
  accent?: "primary" | "gold" | "success" | "warning" | "destructive";
  loading?: boolean;
}

const accentClasses: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  primary: "text-primary bg-primary/10",
  gold: "text-[hsl(var(--gold))] bg-[hsl(var(--gold)/0.1)]",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  destructive: "text-destructive bg-destructive/10",
};

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className, title, metric, unit, description, icon: Icon, accent = "primary", loading, ...props }, ref) => (
    <Card
      ref={ref}
      className={cn(
        "p-5 flex items-start gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {Icon && (
        <span className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", accentClasses[accent])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
        {loading ? (
          <div className="mt-1 h-7 w-20 animate-pulse rounded-md bg-muted" />
        ) : (
          <p className="mt-1 text-xl font-bold text-foreground tabular-nums">
            {metric}
            {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
          </p>
        )}
        {description && <p className="mt-0.5 text-xs text-muted-foreground truncate">{description}</p>}
      </div>
    </Card>
  )
);
MetricCard.displayName = "MetricCard";

export default MetricCard;
