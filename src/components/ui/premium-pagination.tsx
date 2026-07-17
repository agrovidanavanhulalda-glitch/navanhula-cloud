import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface PremiumPaginationProps extends React.HTMLAttributes<HTMLElement> {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  showEdges?: boolean;
  totalLabel?: string;
}

export const PremiumPagination = React.forwardRef<HTMLElement, PremiumPaginationProps>(
  ({ className, page, pageCount, onPageChange, showEdges = true, totalLabel, ...props }, ref) => {
    const safeCount = Math.max(1, pageCount);
    const current = Math.min(Math.max(1, page), safeCount);
    const go = (p: number) => onPageChange(Math.min(Math.max(1, p), safeCount));

    return (
      <nav
        ref={ref}
        aria-label="Paginação"
        className={cn(
          "flex flex-col items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 sm:flex-row",
          className
        )}
        {...props}
      >
        <p className="text-xs text-muted-foreground">
          {totalLabel ?? `Página ${current} de ${safeCount}`}
        </p>
        <div className="flex items-center gap-1">
          {showEdges && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={current === 1}
              onClick={() => go(1)}
              aria-label="Primeira página"
            >
              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={current === 1}
            onClick={() => go(current - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span
            className="mx-2 min-w-[3rem] text-center text-sm font-semibold tabular-nums text-foreground"
            aria-live="polite"
          >
            {current} / {safeCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={current === safeCount}
            onClick={() => go(current + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          {showEdges && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={current === safeCount}
              onClick={() => go(safeCount)}
              aria-label="Última página"
            >
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </nav>
    );
  }
);
PremiumPagination.displayName = "PremiumPagination";

export default PremiumPagination;
