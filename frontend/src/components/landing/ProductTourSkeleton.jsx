import { SkeletonStatStrip, SkeletonRows } from "@/components/kit/Skeletons";
import { cn } from "@/lib/utils";

/** Layout-stable placeholder while ProductTour lazy-loads. */
export function ProductTourSkeleton({ className }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-panel border border-landing-hairline bg-landing-surface",
        className
      )}
      style={{ minHeight: 520 }}
      aria-hidden="true"
    >
      <div className="flex h-9 items-center gap-2 border-b border-landing-hairline px-3">
        <div className="size-2 rounded-full bg-muted" />
        <div className="size-2 rounded-full bg-muted" />
        <div className="size-2 rounded-full bg-muted" />
        <div className="ml-3 h-3 w-32 rounded bg-muted" />
      </div>
      <div className="flex min-h-[480px]">
        <div className="hidden w-44 shrink-0 border-r border-landing-hairline p-3 md:block">
          <div className="mb-4 h-8 rounded-control bg-muted" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-3 rounded bg-muted" />
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3 p-3">
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-7 w-24 shrink-0 rounded-control bg-muted" />
            ))}
          </div>
          <SkeletonStatStrip />
          <SkeletonRows rows={5} columns={4} />
        </div>
      </div>
    </div>
  );
}
