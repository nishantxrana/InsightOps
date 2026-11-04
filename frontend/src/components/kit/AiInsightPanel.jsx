import ReactMarkdown from "react-markdown";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SkeletonPanel } from "./Skeletons";

function SafeLink({ href, children, ...props }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

/**
 * @param {{
 *   title?: string,
 *   provider?: string,
 *   state: 'idle'|'loading'|'ready'|'error'|'disabled',
 *   markdown?: string,
 *   errorText?: string,
 *   disabledReason?: string,
 *   onGenerate?: () => void,
 *   onRegenerate?: () => void,
 *   className?: string,
 * }} props
 */
export function AiInsightPanel({
  title = "AI insight",
  provider,
  state = "idle",
  markdown,
  errorText,
  disabledReason,
  onGenerate,
  onRegenerate,
  className,
}) {
  return (
    <section className={cn("rounded-panel border border-border bg-surface", className)}>
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-5 items-center rounded-control bg-muted px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            AI
          </span>
          <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
          {provider ? (
            <span className="truncate text-xs text-muted-foreground">{provider}</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {state === "ready" && onRegenerate ? (
            <Button type="button" variant="ghost" size="sm" onClick={onRegenerate}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Regenerate
            </Button>
          ) : null}
          {(state === "idle" || state === "error") && onGenerate ? (
            <Button type="button" variant="outline" size="sm" onClick={onGenerate}>
              Generate
            </Button>
          ) : null}
        </div>
      </header>

      <div className="px-3 py-3">
        {state === "loading" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Generating…
            </div>
            <SkeletonPanel />
          </div>
        ) : null}

        {state === "disabled" ? (
          <p className="text-sm text-muted-foreground">
            {disabledReason || "AI insights are disabled."}
          </p>
        ) : null}

        {state === "idle" ? (
          <p className="text-sm text-muted-foreground">
            Generate an insight from the current context.
          </p>
        ) : null}

        {state === "error" ? (
          <p className="text-sm text-danger-foreground" role="alert">
            {errorText || "Failed to generate insight."}
          </p>
        ) : null}

        {state === "ready" && markdown ? (
          <div
            className={cn(
              "prose prose-sm dark:prose-invert max-w-none",
              "prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground",
              "prose-a:text-primary prose-code:text-foreground prose-code:bg-muted prose-code:rounded-control prose-code:px-1",
              "prose-pre:bg-muted prose-pre:border prose-pre:border-border"
            )}
          >
            <ReactMarkdown
              components={{
                a: SafeLink,
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        ) : null}
      </div>
    </section>
  );
}
