import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";

export interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  trend?: number;
  trendLabel?: string;
  hint?: string;
  variant?: "default" | "glass" | "premium" | "gold";
  loading?: boolean;
}

const variantClasses: Record<NonNullable<StatsCardProps["variant"]>, string> = {
  default: "",
  glass:
    "bg-background/40 backdrop-blur-xl backdrop-saturate-150 border-[hsl(var(--gold)/0.15)]",
  premium:
    "relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-[linear-gradient(90deg,transparent,hsl(var(--gold)/0.6),transparent)]",
  gold:
    "border-[hsl(var(--gold)/0.35)] shadow-[0_0_0_1px_hsl(var(--gold)/0.08)]",
};

export const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  (
    { className, label, value, icon: Icon, trend, trendLabel, hint, variant = "default", loading, ...props },
    ref
  ) => {
    const trendUp = typeof trend === "number" && trend >= 0;
    return (
      <Card
        ref={ref}
        className={cn(
          "p-5 flex flex-col gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
          variantClasses[variant],
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {Icon && (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
        </div>
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
        ) : (
          <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        )}
        {(typeof trend === "number" || hint) && (
          <div className="flex items-center gap-2 text-xs">
            {typeof trend === "number" && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-medium",
                  trendUp ? "text-success" : "text-destructive"
                )}
              >
                {trendUp ? (
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-3 w-3" aria-hidden="true" />
                )}
                {Math.abs(trend).toFixed(1)}%
                {trendLabel && <span className="text-muted-foreground font-normal">{trendLabel}</span>}
              </span>
            )}
            {hint && <span className="text-muted-foreground">{hint}</span>}
          </div>
        )}
      </Card>
    );
  }
);
StatsCard.displayName = "StatsCard";

export default StatsCard;
