import * as React from "react";
import { cn } from "@/lib/utils";

export interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "line" | "card" | "avatar" | "stat" | "table";
  lines?: number;
  rows?: number;
}

const Bar: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      "animate-pulse rounded-md bg-gradient-to-r from-muted via-muted/60 to-muted",
      className
    )}
  />
);

export const LoadingSkeleton = React.forwardRef<HTMLDivElement, LoadingSkeletonProps>(
  ({ className, variant = "line", lines = 3, rows = 4, ...props }, ref) => {
    if (variant === "avatar") {
      return (
        <div ref={ref} className={cn("flex items-center gap-3", className)} {...props}>
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <Bar className="h-3 w-1/3" />
            <Bar className="h-2 w-1/2" />
          </div>
        </div>
      );
    }
    if (variant === "stat") {
      return (
        <div
          ref={ref}
          className={cn(
            "rounded-2xl border border-border bg-card p-5 space-y-3",
            className
          )}
          {...props}
        >
          <Bar className="h-3 w-24" />
          <Bar className="h-7 w-32" />
          <Bar className="h-2 w-20" />
        </div>
      );
    }
    if (variant === "card") {
      return (
        <div
          ref={ref}
          className={cn("rounded-2xl border border-border bg-card p-5 space-y-3", className)}
          {...props}
        >
          {Array.from({ length: lines }).map((_, i) => (
            <Bar key={i} className={cn("h-3", i === 0 ? "w-1/3" : i === lines - 1 ? "w-2/3" : "w-full")} />
          ))}
        </div>
      );
    }
    if (variant === "table") {
      return (
        <div ref={ref} className={cn("space-y-2", className)} {...props}>
          <Bar className="h-9 w-full" />
          {Array.from({ length: rows }).map((_, i) => (
            <Bar key={i} className="h-11 w-full" />
          ))}
        </div>
      );
    }
    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <Bar key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    );
  }
);
LoadingSkeleton.displayName = "LoadingSkeleton";

export default LoadingSkeleton;
