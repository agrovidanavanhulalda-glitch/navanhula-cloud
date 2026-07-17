import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  onClear?: () => void;
  variant?: "default" | "glass";
}

export const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(
  (
    {
      className,
      searchValue,
      onSearchChange,
      searchPlaceholder = "Pesquisar...",
      filters,
      onClear,
      variant = "glass",
      children,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center",
        variant === "glass"
          ? "bg-background/40 backdrop-blur-xl backdrop-saturate-150 border-[hsl(var(--gold)/0.15)]"
          : "bg-card border-border",
        className
      )}
      {...props}
    >
      {onSearchChange !== undefined && (
        <div className="relative flex-1 min-w-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchValue ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
            aria-label={searchPlaceholder}
          />
        </div>
      )}
      {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
      {children}
      {onClear && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="sm:ml-auto"
          aria-label="Limpar filtros"
        >
          <X className="h-4 w-4 mr-1" aria-hidden="true" />
          Limpar
        </Button>
      )}
    </div>
  )
);
FilterBar.displayName = "FilterBar";

export default FilterBar;
