import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface PremiumPageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
}

export const PremiumPageHeader = React.forwardRef<HTMLElement, PremiumPageHeaderProps>(
  ({ className, title, subtitle, eyebrow, icon: Icon, actions, breadcrumbs, ...props }, ref) => (
    <header
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[hsl(var(--gold)/0.15)]",
        "bg-background/40 backdrop-blur-xl backdrop-saturate-150",
        "px-5 py-6 sm:px-7 sm:py-7",
        "before:absolute before:inset-x-0 before:top-0 before:h-[2px]",
        "before:bg-[linear-gradient(90deg,transparent,hsl(var(--gold)/0.6),transparent)]",
        className
      )}
      {...props}
    >
      {breadcrumbs && <div className="mb-3">{breadcrumbs}</div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          {Icon && (
            <span className="hidden sm:inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-[hsl(var(--gold)/0.2)]">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--gold))]">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
      </div>
    </header>
  )
);
PremiumPageHeader.displayName = "PremiumPageHeader";

export default PremiumPageHeader;
