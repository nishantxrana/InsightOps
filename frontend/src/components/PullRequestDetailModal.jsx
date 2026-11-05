import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import { Check, Copy, ExternalLink, GitBranch, GitPullRequest } from "lucide-react";

import { apiService } from "../api/apiService";
import { AiInsightPanel } from "@/components/kit/AiInsightPanel";
import { DetailSheet } from "@/components/kit/DetailSheet";
import { KeyValueList } from "@/components/kit/KeyValueList";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { StatusCallout } from "@/components/kit/StatusCallout";
import { prStatus, prVoteStatus } from "@/components/kit/statusMaps";
import { Button } from "@/components/ui/button";

function getPRUrl(pr) {
  return pr?.webUrl || pr?.url || "#";
}

function mergeLabel(mergeStatus) {
  const merge = (mergeStatus || "").toLowerCase();
  if (merge === "conflicts") return "Has conflicts";
  if (merge === "succeeded") return "Clean";
  return mergeStatus || "Unknown";
}

/**
 * DetailSheet for a pull request. Keeps vote / readiness / AI / CTA contracts
 * from the previous centered modal; shell is kit-only.
 */
export default function PullRequestDetailModal({
  pullRequest,
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

  const title = pullRequest?.title || "No title";
  const description = pullRequest?.description || "";
  const status = pullRequest?.status || "Unknown";
  const createdBy = pullRequest?.createdBy?.displayName || "Unknown";
  const sourceBranch = pullRequest?.sourceRefName?.replace("refs/heads/", "") || "Unknown";
  const targetBranch = pullRequest?.targetRefName?.replace("refs/heads/", "") || "Unknown";
  const creationDate = pullRequest?.creationDate;
  const reviewers = pullRequest?.reviewers || [];
  const mergeStatus = pullRequest?.mergeStatus || "unknown";

  const isActive = status?.toLowerCase() === "active";
  const isCompleted = status?.toLowerCase() === "completed";
  const isAbandoned = status?.toLowerCase() === "abandoned";
  const hasConflicts = mergeStatus?.toLowerCase() === "conflicts";

  const approvedReviewers = reviewers.filter((r) => r.vote > 0);
  const rejectedReviewers = reviewers.filter((r) => r.vote < 0);
  const waitingReviewers = reviewers.filter((r) => r.vote === 0 || r.vote === undefined);
  const hasNoReviewers = reviewers.length === 0;

  const isReadyToMerge =
    isActive && approvedReviewers.length > 0 && rejectedReviewers.length === 0 && !hasConflicts;
  const isBlocked = hasConflicts || rejectedReviewers.length > 0;
  const needsReview = isActive && hasNoReviewers;

  const listIndex = useMemo(() => {
    if (!pullRequest || !list.length) return -1;
    return list.findIndex((pr) => pr.pullRequestId === pullRequest.pullRequestId);
  }, [list, pullRequest]);

  const hasPrev = listIndex > 0;
  const hasNext = listIndex >= 0 && listIndex < list.length - 1;

  const callout = useMemo(() => {
    if (!pullRequest) return null;
    if (isActive && isReadyToMerge) {
      return {
        tone: "success",
        title: "Ready to Merge",
        children: `${approvedReviewers.length} approval${approvedReviewers.length > 1 ? "s" : ""}, no blockers`,
      };
    }
    if (isActive && hasConflicts) {
      return {
        tone: "danger",
        title: "Merge Conflicts",
        children: "Resolve conflicts before merging",
      };
    }
    if (isActive && rejectedReviewers.length > 0 && !hasConflicts) {
      return {
        tone: "danger",
        title: "Changes Requested",
        children: `${rejectedReviewers.length} reviewer${rejectedReviewers.length > 1 ? "s" : ""} requested changes`,
      };
    }
    if (isActive && needsReview) {
      return {
        tone: "warning",
        title: "Needs Reviewers",
        children: "Assign reviewers to proceed",
      };
    }
    if (isActive && waitingReviewers.length > 0 && !needsReview && !isReadyToMerge && !isBlocked) {
      return {
        tone: "warning",
        title: "Waiting for Review",
        children: `${waitingReviewers.length} reviewer${waitingReviewers.length > 1 ? "s" : ""} pending`,
      };
    }
    if (isCompleted) {
      return { tone: "success", title: "Merged" };
    }
    if (isAbandoned) {
      return { tone: "neutral", title: "Abandoned" };
    }
    return null;
  }, [
    pullRequest,
    isActive,
    isReadyToMerge,
    hasConflicts,
    rejectedReviewers.length,
    needsReview,
    waitingReviewers.length,
    isBlocked,
    isCompleted,
    isAbandoned,
    approvedReviewers.length,
  ]);

  const aiState = loadingAI ? "loading" : aiError ? "error" : aiExplanation ? "ready" : "idle";

  const loadAIExplanation = async () => {
    if (!pullRequest || loadingAI) return;
    setLoadingAI(true);
    setAiError(null);
    try {
      const response = await apiService.explainPullRequest(pullRequest.pullRequestId);
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
      await navigator.clipboard.writeText(getPRUrl(pullRequest));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available in some contexts
    }
  };

  useEffect(() => {
    if (isOpen && pullRequest) {
      setAiExplanation(null);
      setAiError(null);
      setLoadingAI(false);
      setCopied(false);
    }
    // Reset AI/copy state when the opened PR changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: key off id, not object identity
  }, [isOpen, pullRequest?.pullRequestId]);

  const ctaLabel = isReadyToMerge
    ? "Merge in Azure DevOps"
    : hasConflicts
      ? "Resolve Conflicts"
      : needsReview
        ? "Add Reviewers"
        : isActive
          ? "Review in Azure DevOps"
          : "View in Azure DevOps";

  if (!pullRequest) return null;

  return (
    <DetailSheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      triggerRef={triggerRef}
      icon={<GitPullRequest />}
      title={`#${pullRequest.pullRequestId} ${title}`}
      description={`Pull request ${pullRequest.pullRequestId}`}
      status={
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge {...prStatus(pullRequest)} />
        </div>
      }
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
              href={getPRUrl(pullRequest)}
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
            <a href={getPRUrl(pullRequest)} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" aria-hidden="true" />
              {ctaLabel}
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
            { label: "Author", value: createdBy },
            {
              label: "Created",
              value: creationDate
                ? formatDistanceToNow(new Date(creationDate), { addSuffix: true })
                : "Unknown",
            },
            {
              label: "Reviewers",
              value: hasNoReviewers ? "None assigned" : `${reviewers.length} assigned`,
            },
            { label: "Merge status", value: mergeLabel(mergeStatus) },
          ]}
        />

        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <GitBranch className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate font-mono text-[13px] text-foreground">
            {sourceBranch}
            <span className="mx-1.5 text-muted-foreground">→</span>
            {targetBranch}
          </span>
        </div>

        {reviewers.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Reviewers{" "}
              <span className="font-normal text-muted-foreground">
                ({approvedReviewers.length}/{reviewers.length} approved)
              </span>
            </h3>
            <ul className="space-y-1.5">
              {reviewers.map((reviewer, index) => (
                <li
                  key={`${reviewer.displayName}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-control border border-border bg-surface px-2.5 py-2"
                >
                  <span className="min-w-0 truncate text-sm text-foreground">
                    {reviewer.displayName}
                  </span>
                  <StatusBadge {...prVoteStatus(reviewer.vote)} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <AiInsightPanel
          title="Summarize Changes"
          state={aiState}
          markdown={aiExplanation || undefined}
          errorText={aiError || undefined}
          onGenerate={loadAIExplanation}
          onRegenerate={loadAIExplanation}
        />

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Description</h3>
          {description ? (
            <div className="prose prose-sm dark:prose-invert max-w-none rounded-panel border border-border bg-muted/40 px-3 py-3 text-foreground">
              <ReactMarkdown>{description}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No description provided for this pull request.
            </p>
          )}
        </div>
      </div>
    </DetailSheet>
  );
}
