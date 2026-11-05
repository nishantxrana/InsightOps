import { useEffect } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Detail panel contained inside the product tour frame (not portaled).
 * Esc closes; focus returns via onClose. Does not trap page focus.
 */
export function ContainedDetailPanel({
  open,
  onClose,
  title,
  subtitle,
  status,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  children,
  className,
}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <motion.aside
      role="region"
      aria-label={title ? `Details: ${title}` : "Sample detail panel"}
      initial={reduceMotion ? false : { opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 flex max-h-[85%] flex-col border-t border-border bg-surface shadow-sm sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(100%,22rem)] sm:border-l sm:border-t-0 md:w-[24rem]",
        className
      )}
    >
      <header className="flex shrink-0 items-start gap-2 border-b border-border px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
            {status}
          </div>
          {subtitle ? (
            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {onPrev || onNext ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={!hasPrev}
                onClick={onPrev}
                aria-label="Previous item"
              >
                <ChevronUp className="size-3.5" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={!hasNext}
                onClick={onNext}
                aria-label="Next item"
              >
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onClose}
            aria-label="Close detail panel"
          >
            <X className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">{children}</div>
    </motion.aside>
  );
}
