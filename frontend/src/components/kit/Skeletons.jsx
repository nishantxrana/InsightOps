import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function SkeletonStatStrip({ className, cells = 4 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-panel border border-border bg-surface md:grid-cols-4",
        className
      )}
    >
      {Array.from({ length: cells }).map((_, i) => (
        <div key={i} className="space-y-2 border-b border-r border-border p-4 last:border-r-0">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ rows = 5, columns = 4, className }) {
  return (
    <div className={cn("overflow-hidden rounded-panel border border-border", className)}>
      <div className="flex gap-4 border-b border-border bg-muted/40 px-3 py-2">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex h-row items-center gap-4 px-3">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonPanel({ className }) {
  return (
    <div className={cn("space-y-3 rounded-panel border border-border bg-surface p-4", className)}>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
