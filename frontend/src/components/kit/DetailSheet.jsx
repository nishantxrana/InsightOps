import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Right-side detail panel. Never nest / stack sheets.
 *
 * Focus returns to the triggering control when the sheet closes if the caller
 * keeps a ref and focuses it in `onOpenChange(false)`, or passes
 * `triggerRef` so this component restores focus automatically.
 *
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   icon?: React.ReactNode,
 *   title: string,
 *   subtitle?: React.ReactNode,
 *   status?: React.ReactNode,
 *   headerActions?: React.ReactNode,
 *   onPrev?: () => void,
 *   onNext?: () => void,
 *   hasPrev?: boolean,
 *   hasNext?: boolean,
 *   footer?: React.ReactNode,
 *   children: React.ReactNode,
 *   triggerRef?: React.RefObject<HTMLElement>,
 *   description?: string,
 *   className?: string,
 * }} props
 */
export function DetailSheet({
  open,
  onOpenChange,
  icon,
  title,
  subtitle,
  status,
  headerActions,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  footer,
  children,
  triggerRef,
  description,
  className,
}) {
  const wasOpen = useRef(false);

  useEffect(() => {
    if (wasOpen.current && !open && triggerRef?.current) {
      triggerRef.current.focus?.();
    }
    wasOpen.current = open;
  }, [open, triggerRef]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal>
      <SheetContent
        side="right"
        className={cn(
          "flex w-full flex-col gap-0 p-0 sm:max-w-[560px]",
          "max-w-[90vw] max-sm:w-screen max-sm:max-w-none",
          className
        )}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">
          {description || subtitle || `Details for ${title}`}
        </SheetDescription>

        <header className="sticky top-0 z-10 flex shrink-0 items-start gap-3 border-b border-border bg-surface px-4 py-3 pr-12">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {icon ? (
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-control bg-muted text-muted-foreground [&>svg]:size-4">
                {icon}
              </div>
            ) : null}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
                {status}
              </div>
              {subtitle ? (
                <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {(onPrev || onNext) && (
              <div className="mr-1 flex items-center rounded-control border border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-none"
                  onClick={onPrev}
                  disabled={!hasPrev}
                  aria-label="Previous item"
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-none"
                  onClick={onNext}
                  disabled={!hasNext}
                  aria-label="Next item"
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>
            )}
            {headerActions}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer ? (
          <footer className="sticky bottom-0 shrink-0 border-t border-border bg-surface px-4 py-3">
            {footer}
          </footer>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
