import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { AiInsightPanel } from "@/components/kit/AiInsightPanel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * Collapsible sprint AI summary. Enable/Disable persists via parent (localStorage).
 *
 * @param {{
 *   enabled: boolean,
 *   onEnabledChange: (next: boolean) => void,
 *   loading: boolean,
 *   summary: { summary?: string, status?: string } | null,
 *   onRetry: () => void,
 * }} props
 */
export function SprintInsights({ enabled, onEnabledChange, loading, summary, onRetry }) {
  const [open, setOpen] = useState(false);

  let panelState = "disabled";
  let markdown;
  let errorText;
  let disabledReason = "AI insights are off";

  if (!enabled) {
    panelState = "disabled";
    disabledReason = "AI insights are off";
  } else if (loading) {
    panelState = "loading";
  } else if (summary?.status === "error") {
    panelState = "error";
    errorText = summary.summary || "AI summary temporarily unavailable.";
  } else if (summary?.summary) {
    panelState = "ready";
    markdown = summary.summary;
    if (summary.status === "disabled_large_dataset") {
      markdown = `${summary.summary}\n\n_AI analysis is limited for large datasets to keep performance stable._`;
    }
  } else {
    panelState = "error";
    errorText = "AI insights unavailable.";
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-panel border border-border bg-surface"
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-control text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
              aria-hidden="true"
            />
            <span className="truncate text-sm font-semibold text-foreground">
              AI Sprint Insights
            </span>
          </button>
        </CollapsibleTrigger>
        <div className="flex shrink-0 items-center gap-2">
          <Label htmlFor="ai-summary-enabled" className="text-xs text-muted-foreground">
            {enabled ? "Enabled" : "Disabled"}
          </Label>
          <Switch
            id="ai-summary-enabled"
            checked={enabled}
            onCheckedChange={onEnabledChange}
            aria-label={enabled ? "Disable AI insights" : "Enable AI insights"}
          />
        </div>
      </div>
      <CollapsibleContent>
        <div className="border-t border-border p-3">
          <AiInsightPanel
            title="Sprint summary"
            state={panelState}
            markdown={markdown}
            errorText={errorText}
            disabledReason={disabledReason}
            onGenerate={enabled && panelState === "error" ? onRetry : undefined}
            onRegenerate={enabled && panelState === "ready" ? onRetry : undefined}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
