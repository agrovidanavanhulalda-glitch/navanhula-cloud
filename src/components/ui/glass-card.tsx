import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, type CardProps } from "@/components/ui/card";

export interface GlassCardProps extends CardProps {
  intensity?: "subtle" | "medium" | "strong";
  goldRail?: boolean;
}

const intensityClasses: Record<NonNullable<GlassCardProps["intensity"]>, string> = {
  subtle: "bg-background/60 backdrop-blur-md",
  medium: "bg-background/40 backdrop-blur-xl backdrop-saturate-150",
  strong: "bg-background/25 backdrop-blur-2xl backdrop-saturate-200",
};

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, intensity = "medium", goldRail = false, children, ...props }, ref) => (
    <Card
      ref={ref}
      className={cn(
        "relative overflow-hidden border-[hsl(var(--gold)/0.15)] transition-all duration-300",
        intensityClasses[intensity],
        goldRail &&
          "before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-[linear-gradient(90deg,transparent,hsl(var(--gold)/0.6),transparent)]",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  )
);
GlassCard.displayName = "GlassCard";

export default GlassCard;
