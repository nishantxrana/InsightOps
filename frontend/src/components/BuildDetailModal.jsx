import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow, differenceInMinutes, differenceInSeconds } from "date-fns";
import { Check, Copy, ExternalLink, Building2 } from "lucide-react";

import { apiService } from "../api/apiService";
import { AiInsightPanel } from "@/components/kit/AiInsightPanel";
import { DetailSheet } from "@/components/kit/DetailSheet";
import { KeyValueList } from "@/components/kit/KeyValueList";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { StatusCallout } from "@/components/kit/StatusCallout";
import { buildStatus } from "@/components/kit/statusMaps";
import { Button } from "@/components/ui/button";

function getBuildUrl(build) {
  return build?._links?.web?.href || "#";
}

function formatSheetDuration(startTime, finishTime) {
  if (!startTime) return null;
  const end = finishTime ? new Date(finishTime) : new Date();
  const start = new Date(startTime);
  const mins = differenceInMinutes(end, start);
  const secs = differenceInSeconds(end, start) % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

/**
 * DetailSheet for a build. Keeps analyzeBuild / ADO link contracts;
 * shell is kit-only.
 */
export default function BuildDetailModal({
  build,
  isOpen,
  onClose,
  list = [],
  onNavigate,
  triggerRef,
}) {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [copied, setCopied] = useState(false);

  const buildNumber = build?.buildNumber || "Unknown";
  const definition = build?.definition?.name || "Unknown Pipeline";
  const requestedBy = build?.requestedBy?.displayName || "Unknown";
  const sourceBranch = build?.sourceBranch?.replace("refs/heads/", "") || "Unknown";
  const startTime = build?.startTime;
  const finishTime = build?.finishTime;
  const reason = build?.reason || "Unknown";

  const isFailed = build?.result === "failed";
  const isInProgress = build?.status === "inProgress";
  const isSucceeded = build?.result === "succeeded";
  const duration = formatSheetDuration(startTime, finishTime);

  const listIndex = useMemo(() => {
    if (!build || !list.length) return -1;
    return list.findIndex((b) => b.id === build.id);
  }, [list, build]);

  const hasPrev = listIndex > 0;
  const hasNext = listIndex >= 0 && listIndex < list.length - 1;

  const callout = useMemo(() => {
    if (!build) return null;
    if (isFailed) {
      return {
        tone: "danger",
        title: "Build Failed",
        children: "Review logs and failure analysis below",
      };
    }
    if (isSucceeded) {
      return { tone: "success", title: "Build Succeeded" };
    }
    if (isInProgress) {
      return { tone: "info", title: "Build In Progress" };
    }
    return null;
  }, [build, isFailed, isSucceeded, isInProgress]);

  const aiState = loadingAI ? "loading" : aiError ? "error" : aiAnalysis ? "ready" : "idle";

  const loadAIAnalysis = async () => {
    if (!build || loadingAI) return;
    setLoadingAI(true);
    setAiError(null);
    try {
      const response = await apiService.analyzeBuild(build.id);
      setAiAnalysis(response.analysis);
    } catch (error) {
      setAiAnalysis(null);
      setAiError(error.userMessage || "AI analysis temporarily unavailable.");
    } finally {
      setLoadingAI(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getBuildUrl(build));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available in some contexts
    }
  };

  useEffect(() => {
    if (isOpen && build) {
      setAiAnalysis(null);
      setAiError(null);
      setLoadingAI(false);
      setCopied(false);
    }
    // Reset AI/copy state when the opened build changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: key off id, not object identity
  }, [isOpen, build?.id]);

  if (!build) return null;

  return (
    <DetailSheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      triggerRef={triggerRef}
      icon={<Building2 />}
      title={`#${buildNumber} ${definition}`}
      description={`Build ${buildNumber}`}
      status={<StatusBadge {...buildStatus(build)} />}
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
              href={getBuildUrl(build)}
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
            <a href={getBuildUrl(build)} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" aria-hidden="true" />
              {isFailed ? "View Logs in Azure DevOps" : "Open in Azure DevOps"}
            </a>
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {callout ? (
          <StatusCallout tone={callout.tone} title={callout.title}>
            {callout.children}
          </StatusCallout>
        ) : null}

        <KeyValueList
          columns={4}
          items={[
            { label: "Triggered By", value: requestedBy },
            { label: "Branch", value: sourceBranch, mono: true },
            {
              label: "Started",
              value: startTime
                ? formatDistanceToNow(new Date(startTime), { addSuffix: true })
                : "Unknown",
            },
            {
              label: duration ? "Duration" : "Trigger reason",
              value: duration || reason,
            },
          ]}
        />

        {isFailed ? (
          <AiInsightPanel
            title="Failure analysis"
            state={aiState}
            markdown={aiAnalysis || undefined}
            errorText={aiError || undefined}
            onGenerate={loadAIAnalysis}
            onRegenerate={loadAIAnalysis}
          />
        ) : null}
      </div>
    </DetailSheet>
  );
}
