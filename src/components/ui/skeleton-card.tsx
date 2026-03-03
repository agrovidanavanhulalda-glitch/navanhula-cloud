import { Skeleton } from "@/components/ui/skeleton";

export const SkeletonKPI = () => (
  <div className="rounded-xl border border-border p-5 space-y-3" style={{ background: 'var(--gradient-card)' }}>
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-3 w-24" />
    </div>
    <Skeleton className="h-8 w-32" />
    <Skeleton className="h-3 w-20" />
  </div>
);

export const SkeletonChart = ({ height = 300 }: { height?: number }) => (
  <div className="rounded-xl border border-border p-6" style={{ background: 'var(--gradient-card)' }}>
    <Skeleton className="h-5 w-40 mb-4" />
    <Skeleton className={`w-full rounded-lg`} style={{ height }} />
  </div>
);

export const SkeletonList = ({ rows = 4 }: { rows?: number }) => (
  <div className="rounded-xl border border-border p-6 space-y-3" style={{ background: 'var(--gradient-card)' }}>
    <Skeleton className="h-5 w-40 mb-2" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="space-y-1.5 text-right">
          <Skeleton className="h-3.5 w-20 ml-auto" />
          <Skeleton className="h-3 w-14 ml-auto" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="rounded-xl border border-border p-6 space-y-3" style={{ background: 'var(--gradient-card)' }}>
    <Skeleton className="h-5 w-40 mb-4" />
    <div className="space-y-2">
      <div className="flex gap-4 p-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 rounded bg-muted/10">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  </div>
);
