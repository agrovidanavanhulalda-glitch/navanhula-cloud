import * as React from "react";
import { cn } from "@/lib/utils";

export interface ActionToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  left?: React.ReactNode;
  right?: React.ReactNode;
  sticky?: boolean;
  variant?: "default" | "glass";
}

export const ActionToolbar = React.forwardRef<HTMLDivElement, ActionToolbarProps>(
  ({ className, left, right, sticky, variant = "default", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between",
        variant === "glass"
          ? "bg-background/40 backdrop-blur-xl backdrop-saturate-150 border-[hsl(var(--gold)/0.15)]"
          : "bg-card border-border",
        sticky && "sticky top-16 z-20",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <div className="flex flex-wrap items-center gap-2">{left}</div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">{right}</div>
        </>
      )}
    </div>
  )
);
ActionToolbar.displayName = "ActionToolbar";

export default ActionToolbar;
