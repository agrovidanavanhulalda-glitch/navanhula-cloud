import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-[0_8px_24px_-8px_hsl(var(--destructive)/0.5)]",
        outline:
          "border border-input bg-background/60 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground hover:border-[hsl(var(--gold)/0.4)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-success text-success-foreground hover:bg-success/90 hover:shadow-[0_8px_24px_-8px_hsl(var(--success)/0.5)]",
        warning:
          "bg-warning text-warning-foreground hover:bg-warning/90 hover:shadow-[0_8px_24px_-8px_hsl(var(--warning)/0.5)]",
        premium:
          "text-primary-foreground bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--primary-glow))_50%,hsl(var(--primary))_100%)] hover:brightness-110 hover:shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.55),0_0_0_1px_hsl(var(--gold)/0.25)] ring-1 ring-[hsl(var(--gold)/0.25)]",
        gold:
          "text-[hsl(var(--gold-foreground))] bg-[linear-gradient(135deg,hsl(var(--gold))_0%,hsl(45_95%_65%)_50%,hsl(var(--gold))_100%)] hover:brightness-110 hover:shadow-[0_10px_30px_-8px_hsl(var(--gold)/0.6)]",
        glass:
          "bg-background/40 backdrop-blur-xl border border-border/60 text-foreground hover:bg-background/60 hover:border-[hsl(var(--gold)/0.4)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-lg px-8",
        xl: "h-14 rounded-xl px-10 text-base font-semibold tracking-wide",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }
    
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || disabled}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
