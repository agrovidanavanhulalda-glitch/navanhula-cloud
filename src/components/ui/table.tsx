import * as React from "react";

import { cn } from "@/lib/utils";

type TableVariant = "default" | "enterprise" | "glass";

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  variant?: TableVariant;
  stickyHeader?: boolean;
  zebra?: boolean;
}

const TableContext = React.createContext<{ variant: TableVariant; stickyHeader: boolean; zebra: boolean }>({
  variant: "default",
  stickyHeader: false,
  zebra: false,
});

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant = "default", stickyHeader = false, zebra = false, ...props }, ref) => (
    <TableContext.Provider value={{ variant, stickyHeader, zebra }}>
      <div
        className={cn(
          "relative w-full overflow-x-auto overflow-y-hidden rounded-lg",
          variant === "enterprise" &&
            "border border-border/60 bg-card/40 backdrop-blur-sm shadow-[0_1px_0_0_hsl(var(--gold)/0.15)_inset]",
          variant === "glass" &&
            "border border-white/10 bg-background/40 backdrop-blur-xl backdrop-saturate-150",
        )}
      >
        <table
          ref={ref}
          className={cn("w-full caption-bottom text-sm min-w-[600px]", className)}
          style={{ writingMode: "horizontal-tb", textOrientation: "mixed" }}
          {...props}
        />
      </div>
    </TableContext.Provider>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => {
    const { variant, stickyHeader } = React.useContext(TableContext);
    return (
      <thead
        ref={ref}
        className={cn(
          "[&_tr]:border-b",
          variant !== "default" &&
            "[&_tr]:border-border/60 [&_th]:bg-gradient-to-b [&_th]:from-muted/50 [&_th]:to-muted/20 [&_th]:text-foreground [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-xs [&_th]:uppercase",
          stickyHeader && "[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:backdrop-blur-sm",
          className,
        )}
        {...props}
      />
    );
  },
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => {
    const { zebra } = React.useContext(TableContext);
    return (
      <tbody
        ref={ref}
        className={cn(
          "[&_tr:last-child]:border-0",
          zebra && "[&_tr:nth-child(even)]:bg-muted/20",
          className,
        )}
        {...props}
      />
    );
  },
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => {
    const { variant } = React.useContext(TableContext);
    return (
      <tr
        ref={ref}
        className={cn(
          "border-b transition-colors data-[state=selected]:bg-muted hover:bg-muted/50",
          variant !== "default" &&
            "border-border/40 hover:bg-gradient-to-r hover:from-primary/5 hover:via-transparent hover:to-transparent data-[state=selected]:bg-primary/10 data-[state=selected]:shadow-[inset_3px_0_0_0_hsl(var(--gold))]",
          className,
        )}
        {...props}
      />
    );
  },
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("p-4 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
