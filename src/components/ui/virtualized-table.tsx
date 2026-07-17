import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Enterprise VirtualizedTable — presentational primitives only.
 *
 * This module intentionally does NOT own the virtualization strategy.
 * It exposes styled building blocks that wrap the existing
 * `@tanstack/react-virtual` implementation on each page, preserving
 * the current performance characteristics (no extra renders, no
 * additional passes, same virtual window).
 *
 * Usage pattern (mirrors the existing native `<table>` layout):
 *
 *   <VirtualizedTableShell variant="enterprise">
 *     <VirtualizedTableScroll ref={parentRef} maxHeight={600}>
 *       <VirtualizedTableRoot>
 *         <VirtualizedTableHeader sticky>
 *           <VirtualizedTableRow header>
 *             <VirtualizedTableHead>Produto</VirtualizedTableHead>
 *             ...
 *           </VirtualizedTableRow>
 *         </VirtualizedTableHeader>
 *         <VirtualizedTableBody totalSize={rowVirtualizer.getTotalSize()}>
 *           {rowVirtualizer.getVirtualItems().map(v => (
 *             <VirtualizedTableRow
 *               key={items[v.index].id}
 *               virtual={{ size: v.size, start: v.start }}
 *               zebra={v.index % 2 === 1}
 *             >
 *               <VirtualizedTableCell>...</VirtualizedTableCell>
 *             </VirtualizedTableRow>
 *           ))}
 *         </VirtualizedTableBody>
 *       </VirtualizedTableRoot>
 *     </VirtualizedTableScroll>
 *   </VirtualizedTableShell>
 */

export type VirtualizedTableVariant = 'enterprise' | 'glass';

interface VirtualizedTableShellProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: VirtualizedTableVariant;
}

export const VirtualizedTableShell = forwardRef<HTMLDivElement, VirtualizedTableShellProps>(
  ({ variant = 'enterprise', className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-xl border shadow-sm',
        variant === 'enterprise' &&
          'border-border/60 bg-card',
        variant === 'glass' &&
          'border-white/10 bg-card/60 backdrop-blur-xl supports-[backdrop-filter]:bg-card/40',
        // institutional gradient rail (Azul → Dourado)
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-primary before:via-primary/60 before:to-[hsl(45_90%_55%)]",
        className,
      )}
      {...props}
    />
  ),
);
VirtualizedTableShell.displayName = 'VirtualizedTableShell';

interface VirtualizedTableScrollProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: number | string;
}

export const VirtualizedTableScroll = forwardRef<HTMLDivElement, VirtualizedTableScrollProps>(
  ({ maxHeight = 600, className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('overflow-x-auto overflow-y-auto', className)}
      style={{ maxHeight, ...style }}
      {...props}
    />
  ),
);
VirtualizedTableScroll.displayName = 'VirtualizedTableScroll';

export const VirtualizedTableRoot = forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <table
    ref={ref}
    className={cn('w-full relative border-collapse text-sm', className)}
    {...props}
  />
));
VirtualizedTableRoot.displayName = 'VirtualizedTableRoot';

interface VirtualizedTableHeaderProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {
  sticky?: boolean;
}

export const VirtualizedTableHeader = forwardRef<
  HTMLTableSectionElement,
  VirtualizedTableHeaderProps
>(({ sticky = true, className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      'bg-gradient-to-b from-muted/70 to-muted/40 backdrop-blur-sm',
      sticky && 'sticky top-0 z-10',
      className,
    )}
    {...props}
  />
));
VirtualizedTableHeader.displayName = 'VirtualizedTableHeader';

interface VirtualizedTableBodyProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {
  /** Total virtual size from `rowVirtualizer.getTotalSize()`. */
  totalSize?: number;
}

export const VirtualizedTableBody = forwardRef<
  HTMLTableSectionElement,
  VirtualizedTableBodyProps
>(({ totalSize, className, style, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(className)}
    style={
      totalSize != null
        ? { height: `${totalSize}px`, position: 'relative', ...style }
        : style
    }
    {...props}
  />
));
VirtualizedTableBody.displayName = 'VirtualizedTableBody';

interface VirtualizedTableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {
  header?: boolean;
  zebra?: boolean;
  selected?: boolean;
  /** When provided, positions the row absolutely for react-virtual. */
  virtual?: { size: number; start: number };
}

export const VirtualizedTableRow = forwardRef<
  HTMLTableRowElement,
  VirtualizedTableRowProps
>(({ header, zebra, selected, virtual, className, style, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'group border-b border-border/50',
      !header &&
        'transition-colors hover:bg-primary/[0.04] focus-within:bg-primary/[0.04]',
      // hover gold rail on the left edge
      !header &&
        'relative before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-[hsl(45_90%_55%)] before:opacity-0 before:transition-opacity group-hover:before:opacity-100',
      zebra && !header && 'bg-muted/20',
      selected && 'bg-primary/10',
      virtual && 'absolute left-0 w-full flex items-center',
      className,
    )}
    style={
      virtual
        ? {
            height: `${virtual.size}px`,
            transform: `translateY(${virtual.start}px)`,
            ...style,
          }
        : style
    }
    {...props}
  />
));
VirtualizedTableRow.displayName = 'VirtualizedTableRow';

export const VirtualizedTableHead = forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'text-left p-4 font-semibold text-xs uppercase tracking-wide text-muted-foreground',
      className,
    )}
    {...props}
  />
));
VirtualizedTableHead.displayName = 'VirtualizedTableHead';

export const VirtualizedTableCell = forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn('p-4 align-middle', className)} {...props} />
));
VirtualizedTableCell.displayName = 'VirtualizedTableCell';
