import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Inbox, type LucideIcon } from "lucide-react";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: { label: string; onClick: () => void; icon?: LucideIcon };
  secondaryAction?: { label: string; onClick: () => void };
  /** @deprecated use primaryAction */
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  helpText?: string;
  variant?: "default" | "glass" | "premium";
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      icon: Icon = Inbox,
      title,
      description,
      primaryAction,
      secondaryAction,
      action,
      helpText,
      variant = "default",
      ...props
    },
    ref,
  ) => {
    const primary = primaryAction ?? action;
    return (
    <div
      ref={ref}
      role="status"
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 rounded-xl",
        variant === "glass" &&
          "bg-background/40 backdrop-blur-xl border border-white/10",
        variant === "premium" &&
          "relative overflow-hidden bg-gradient-to-br from-card via-card to-card/80 border border-border/60 before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-[linear-gradient(90deg,transparent_0%,hsl(var(--primary)/0.4)_20%,hsl(var(--gold)/0.6)_50%,hsl(var(--primary)/0.4)_80%,transparent_100%)]",
        className,
      )}
      {...props}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent ring-1 ring-[hsl(var(--gold)/0.25)]">
        <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {primaryAction && (
            <Button onClick={primaryAction.onClick} variant="premium">
              {primaryAction.icon && <primaryAction.icon className="mr-2 h-4 w-4" />}
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
      {helpText && (
        <p className="mt-4 text-xs text-muted-foreground/80">{helpText}</p>
      )}
    </div>
  ),
);
EmptyState.displayName = "EmptyState";

export default EmptyState;
