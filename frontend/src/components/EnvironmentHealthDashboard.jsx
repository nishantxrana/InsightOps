import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Server } from "lucide-react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function successTone(rate) {
  if (rate >= 90) return "success";
  if (rate >= 70) return "warning";
  return "danger";
}

function EnvCell({ name, stats }) {
  const total = stats.total || 0;
  const success = stats.success || 0;
  const failed = stats.failed || 0;
  const rate = total > 0 ? Math.round((success / total) * 100) : 0;
  const tone = successTone(rate);
  const successPct = total > 0 ? (success / total) * 100 : 0;
  const failedPct = total > 0 ? (failed / total) * 100 : 0;

  const rateClass =
    tone === "success"
      ? "text-success-foreground"
      : tone === "warning"
        ? "text-warning-foreground"
        : "text-danger-foreground";

  return (
    <div className="min-w-[11rem] flex-1 rounded-panel border border-border bg-surface px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium text-foreground" title={name}>
          {name}
        </p>
        <span className={cn("shrink-0 text-xs font-semibold tabular-nums", rateClass)}>
          {rate}%
        </span>
      </div>
      <div
        className="mt-2 flex h-1 w-full overflow-hidden rounded-control bg-muted"
        role="img"
        aria-label={`${name}: ${success} succeeded, ${failed} failed of ${total}`}
      >
        {successPct > 0 ? (
          <div className="h-full bg-success" style={{ width: `${successPct}%` }} />
        ) : null}
        {failedPct > 0 ? (
          <div className="h-full bg-danger" style={{ width: `${failedPct}%` }} />
        ) : null}
      </div>
      <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
        {total} total · {success} success · {failed} failed
      </p>
    </div>
  );
}

export function EnvironmentHealthSkeleton({ cells = 3 }) {
  return (
    <div className="rounded-panel border border-border bg-surface px-3 py-3">
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="size-4" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: cells }).map((_, i) => (
          <div
            key={i}
            className="min-w-[11rem] flex-1 space-y-2 rounded-panel border border-border p-3"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-1 w-full" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact collapsible strip of environment health cells.
 * @param {{ environmentStats?: Record<string, { total: number, success: number, failed: number }>, loading?: boolean }} props
 */
export default function EnvironmentHealthDashboard({ environmentStats, loading = false }) {
  const [open, setOpen] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (loading) {
    return <EnvironmentHealthSkeleton />;
  }

  if (!environmentStats || Object.keys(environmentStats).length === 0) {
    return (
      <div className="rounded-panel border border-border bg-surface px-3 py-4 text-center">
        <Server className="mx-auto mb-2 size-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">No environment data available</p>
      </div>
    );
  }

  const environments = Object.entries(environmentStats).sort(([, a], [, b]) => b.total - a.total);
  const totalEnvironments = environments.length;
  const cardsPerPage = 4;
  const totalPages = Math.ceil(totalEnvironments / cardsPerPage);

  const nextSlide = () => {
    setCurrentIndex((prev) => {
      const nextIndex = prev + cardsPerPage;
      return nextIndex >= totalEnvironments ? 0 : nextIndex;
    });
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => {
      const prevIndex = prev - cardsPerPage;
      return prevIndex < 0 ? Math.max(0, totalEnvironments - cardsPerPage) : prevIndex;
    });
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-panel border border-border bg-surface">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 px-2 text-foreground"
              aria-expanded={open}
            >
              <ChevronDown
                className={cn("size-3.5 transition-transform", open ? "rotate-0" : "-rotate-90")}
                aria-hidden="true"
              />
              <Server className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium">Environment Health</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {totalEnvironments}
              </span>
            </Button>
          </CollapsibleTrigger>

          {open && totalEnvironments > cardsPerPage ? (
            <div className="hidden items-center gap-1 sm:flex">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={prevSlide}
                disabled={currentIndex === 0}
                aria-label="Previous environments"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {Math.floor(currentIndex / cardsPerPage) + 1} / {totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={nextSlide}
                disabled={currentIndex + cardsPerPage >= totalEnvironments}
                aria-label="Next environments"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          ) : null}
        </div>

        <CollapsibleContent>
          <div className="border-t border-border px-3 py-3">
            {/* Mobile carousel */}
            <div className="sm:hidden">
              <Carousel opts={{ align: "start", loop: true }} className="w-full">
                <CarouselContent>
                  {environments.map(([envName, stats]) => (
                    <CarouselItem key={envName} className="basis-[85%]">
                      <EnvCell name={envName} stats={stats} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="-left-2" />
                <CarouselNext className="-right-2" />
              </Carousel>
            </div>

            {/* Desktop: wrap or paginate */}
            <div className="hidden flex-wrap gap-2 sm:flex">
              {environments
                .slice(currentIndex, currentIndex + cardsPerPage)
                .map(([envName, stats]) => (
                  <EnvCell key={envName} name={envName} stats={stats} />
                ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
