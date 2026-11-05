import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Check, Copy, ExternalLink } from "lucide-react";

import { apiService } from "../api/apiService";
import { AiInsightPanel } from "@/components/kit/AiInsightPanel";
import { DetailSheet } from "@/components/kit/DetailSheet";
import { KeyValueList } from "@/components/kit/KeyValueList";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { StatusCallout } from "@/components/kit/StatusCallout";
import { workItemState } from "@/components/kit/statusMaps";
import { Button } from "@/components/ui/button";
import { DescriptionHtml } from "@/pages/work-items/DescriptionHtml";
import { WorkItemTypeIcon } from "@/pages/work-items/WorkItemTypeIcon";
import {
  getAssigneeFromFields,
  getWorkItemUrl,
  isPastDue,
  parseTags,
  priorityFullLabel,
} from "@/pages/work-items/helpers";

/**
 * DetailSheet for a work item. Keeps explain / copy / ADO contracts from the
 * previous centered modal; shell is kit-only.
 */
export default function WorkItemDetailModal({
  workItem,
  isOpen,
  onClose,
  list = [],
  onNavigate,
  triggerRef,
}) {
  const [aiExplanation, setAiExplanation] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [copied, setCopied] = useState(false);

  const title = workItem?.fields?.["System.Title"] || workItem?.title || "No title";
  const description = workItem?.fields?.["System.Description"] || "";
  const state = workItem?.state || workItem?.fields?.["System.State"] || "Unknown";
  const assignee = workItem?.assignee || getAssigneeFromFields(workItem);
  const workItemType = workItem?.fields?.["System.WorkItemType"] || "Item";
  const priority = workItem?.fields?.["Microsoft.VSTS.Common.Priority"];
  const dueDate = workItem?.fields?.["Microsoft.VSTS.Scheduling.DueDate"];
  const createdDate = workItem?.fields?.["System.CreatedDate"];
  const tags = parseTags(workItem?.fields?.["System.Tags"]);

  const overdue = isPastDue(dueDate);
  const priorityNum = Number(priority);
  const isCritical = priorityNum === 1 || String(priority) === "1";
  const needsAssignment = assignee === "Unassigned";

  const callout = useMemo(() => {
    if (!workItem) return null;
    if (overdue) {
      return { tone: "danger", title: "Overdue" };
    }
    if (isCritical) {
      return { tone: "danger", title: "Critical Priority" };
    }
    if (needsAssignment) {
      return { tone: "warning", title: "Needs Assignment" };
    }
    return null;
  }, [workItem, overdue, isCritical, needsAssignment]);

  const listIndex = useMemo(() => {
    if (!workItem || !list.length) return -1;
    return list.findIndex((item) => String(item.id) === String(workItem.id));
  }, [list, workItem]);

  const hasPrev = listIndex > 0;
  const hasNext = listIndex >= 0 && listIndex < list.length - 1;

  const aiState = loadingAI ? "loading" : aiError ? "error" : aiExplanation ? "ready" : "idle";

  const loadAIExplanation = async () => {
    if (!workItem || loadingAI) return;
    setLoadingAI(true);
    setAiError(null);
    try {
      const response = await apiService.explainWorkItem(workItem.id);
      setAiExplanation(response.explanation);
    } catch (error) {
      setAiExplanation(null);
      setAiError(error.userMessage || "AI explanation temporarily unavailable.");
    } finally {
      setLoadingAI(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getWorkItemUrl(workItem));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available in some contexts
    }
  };

  useEffect(() => {
    if (isOpen && workItem) {
      setAiExplanation(null);
      setAiError(null);
      setLoadingAI(false);
      setCopied(false);
    }
    // Reset AI/copy state when the opened item changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: key off id
  }, [isOpen, workItem?.id]);

  if (!workItem) return null;

  return (
    <DetailSheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      triggerRef={triggerRef}
      icon={<WorkItemTypeIcon type={workItemType} />}
      title={`#${workItem.id} ${title}`}
      description={`Work item ${workItem.id}`}
      status={<StatusBadge {...workItemState(state)} />}
      onPrev={hasPrev ? () => onNavigate?.(listIndex - 1) : undefined}
      onNext={hasNext ? () => onNavigate?.(listIndex + 1) : undefined}
      hasPrev={hasPrev}
      hasNext={hasNext}
      headerActions={
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={copyLink}
            aria-label={copied ? "Copied" : "Copy link"}
          >
            {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8" asChild>
            <a
              href={getWorkItemUrl(workItem)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in Azure DevOps"
            >
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </>
      }
      footer={
        <div className="flex justify-end">
          <Button asChild>
            <a href={getWorkItemUrl(workItem)} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Open in Azure DevOps
            </a>
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {callout ? <StatusCallout tone={callout.tone} title={callout.title} /> : null}

        <KeyValueList
          columns={2}
          items={[
            { label: "Assignee", value: assignee },
            { label: "Priority", value: priorityFullLabel(priority) },
            {
              label: "Created",
              value: createdDate ? format(new Date(createdDate), "MMM dd, yyyy") : "Unknown",
            },
            {
              label: "Due Date",
              value: dueDate
                ? `${format(new Date(dueDate), "MMM dd, yyyy")}${overdue ? " (Overdue)" : ""}`
                : "Not set",
            },
          ]}
        />

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-control bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <AiInsightPanel
          title="Generate AI Insights"
          state={aiState}
          markdown={aiExplanation || undefined}
          errorText={aiError || undefined}
          onGenerate={loadAIExplanation}
          onRegenerate={loadAIExplanation}
        />

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Description</h3>
          {description ? (
            <DescriptionHtml html={description} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No description provided for this work item.
            </p>
          )}
        </div>
      </div>
    </DetailSheet>
  );
}
