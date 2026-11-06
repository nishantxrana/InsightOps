import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { AiInsightPanel } from "@/components/kit/AiInsightPanel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatAiMetaLine, mapAiAvailabilityToPanel, SETTINGS_AI_HREF } from "@/lib/aiInsight";
import { cn } from "@/lib/utils";

/**
 * Collapsible sprint AI summary. Enable/Disable persists via parent (localStorage).
 *
 * @param {{
 *   enabled: boolean,
 *   onEnabledChange: (next: boolean) => void,
 *   loading: boolean,
 *   summary: { summary?: string, status?: string, message?: string, meta?: object } | null,
 *   onRetry: () => void,
 *   aiStatus?: { enabled?: boolean, configured?: boolean } | null,
 * }} props
 */
export function SprintInsights({
  enabled,
  onEnabledChange,
  loading,
  summary,
  onRetry,
  aiStatus = null,
}) {
  const [open, setOpen] = useState(false);

  let panelState = "disabled";
  let markdown;
  let errorText;
  let disabledReason = "AI insights are off";
  let settingsHref;
  let providerLine;

  const orgDisabled =
    aiStatus?.enabled === false
      ? {
          state: "disabled",
          disabledReason: "AI is turned off for this organization.",
          settingsHref: SETTINGS_AI_HREF,
        }
      : aiStatus?.configured === false
        ? {
            state: "disabled",
            disabledReason: "AI is not configured. Add a provider and API key in Settings.",
            settingsHref: SETTINGS_AI_HREF,
          }
        : null;

  if (!enabled) {
    panelState = "disabled";
    disabledReason = "AI insights are off";
  } else if (orgDisabled) {
    panelState = orgDisabled.state;
    disabledReason = orgDisabled.disabledReason;
    settingsHref = orgDisabled.settingsHref;
  } else if (loading) {
    panelState = "loading";
  } else {
    const availability = mapAiAvailabilityToPanel(summary);
    if (availability) {
      panelState = availability.state;
      disabledReason = availability.disabledReason;
      settingsHref = availability.settingsHref;
    } else if (summary?.status === "error") {
      panelState = "error";
      errorText = summary.summary || summary.message || "AI summary temporarily unavailable.";
    } else if (
      summary?.summary &&
      summary.status !== "not_configured" &&
      summary.status !== "disabled"
    ) {
      panelState = "ready";
      markdown = summary.summary;
      providerLine = formatAiMetaLine(summary.meta);
    } else {
      panelState = "error";
      errorText = "AI insights unavailable.";
    }
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
            provider={providerLine}
            state={panelState}
            markdown={markdown}
            errorText={errorText}
            disabledReason={disabledReason}
            settingsHref={settingsHref}
            settingsLabel="Open AI settings"
            onGenerate={enabled && panelState === "error" ? onRetry : undefined}
            onRegenerate={enabled && panelState === "ready" ? onRetry : undefined}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
