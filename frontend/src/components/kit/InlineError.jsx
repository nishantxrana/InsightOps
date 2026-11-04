import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Inline error that keeps page chrome visible.
 * @param {{ message: string, onRetry?: () => void, className?: string }} props
 */
export function InlineError({ message, onRetry, className }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-panel border border-danger/30 bg-danger-muted px-3 py-2.5 text-sm text-danger-foreground",
        className
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p>{message || "Something went wrong."}</p>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry} className="shrink-0">
          Retry
        </Button>
      ) : null}
    </div>
  );
}

/**
 * First-load fatal failure — still keeps shell; centers the message.
 * @param {{ message: string, onRetry?: () => void, className?: string }} props
 */
export function PageError({ message, onRetry, className }) {
  return (
    <div
      className={cn("flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4", className)}
      role="alert"
    >
      <AlertCircle className="size-8 text-danger" aria-hidden="true" />
      <div className="max-w-md text-center space-y-1">
        <h2 className="text-base font-semibold text-foreground">Unable to load</h2>
        <p className="text-sm text-muted-foreground">{message || "Something went wrong."}</p>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
