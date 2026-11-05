import { RefreshCw } from "lucide-react";

import { InlineError } from "@/components/kit/InlineError";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  environmentApprovalStatus,
  isApprovalRejected,
  isWaitingForApproval,
} from "./releaseDetailHelpers";

function approvalTone(status) {
  const s = (status || "").toLowerCase();
  if (s === "approved") return "success";
  if (s === "rejected") return "danger";
  return "warning";
}

function ApproverInitials({ name }) {
  const initials = (name || "?")
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase();
  return (
    <div
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-foreground"
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

/**
 * Approvals counters + rows. Surfaces fetch failures with InlineError + Retry.
 */
export function ReleaseApprovalsTab({
  release,
  approvals,
  loadingApprovals,
  approvalsError,
  onRefresh,
}) {
  const waiting = isWaitingForApproval(release);
  const rejected = isApprovalRejected(release);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {waiting ? "Pending Approvals" : "Approval History"}
        </h3>
        {!loadingApprovals ? (
          <Button type="button" variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Refresh
          </Button>
        ) : null}
      </div>

      {loadingApprovals ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
          Loading approval details…
        </div>
      ) : null}

      {approvalsError && !loadingApprovals ? (
        <InlineError message={approvalsError} onRetry={onRefresh} />
      ) : null}

      {approvals && !loadingApprovals ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-panel border border-border bg-muted/40 px-3 py-2.5 text-center">
              <p
                className={cn(
                  "text-xl font-semibold tabular-nums",
                  approvals.pendingApprovals > 0 ? "text-warning-foreground" : "text-foreground"
                )}
              >
                {approvals.pendingApprovals}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="rounded-panel border border-border bg-muted/40 px-3 py-2.5 text-center">
              <p className="text-xl font-semibold tabular-nums text-success-foreground">
                {approvals.approvedCount}
              </p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <div className="rounded-panel border border-border bg-muted/40 px-3 py-2.5 text-center">
              <p
                className={cn(
                  "text-xl font-semibold tabular-nums",
                  approvals.rejectedCount > 0 || rejected
                    ? "text-danger-foreground"
                    : "text-foreground"
                )}
              >
                {approvals.rejectedCount}
              </p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </div>

          {Object.keys(approvals.environmentApprovals || {}).length === 0 ? (
            <p className="rounded-panel border border-border bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
              {release?.status === "succeeded"
                ? "Approval history is not available for completed releases. All required approvals were granted."
                : "No approval gates configured for this release pipeline."}
            </p>
          ) : (
            Object.entries(approvals.environmentApprovals).map(([envId, envApproval]) => {
              const status = environmentApprovalStatus(envApproval);
              return (
                <div key={envId} className="overflow-hidden rounded-panel border border-border">
                  <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2.5">
                    <h4 className="text-sm font-medium text-foreground">
                      {envApproval.environmentName}
                    </h4>
                    <StatusBadge
                      tone={approvalTone(status)}
                      label={status.charAt(0).toUpperCase() + status.slice(1)}
                    />
                  </div>

                  {envApproval.approvals?.length > 0 ? (
                    <ul className="divide-y divide-border">
                      {envApproval.approvals.map((approval) => (
                        <li key={approval.id} className="flex items-start gap-3 px-3 py-3">
                          {approval.approver?.imageUrl ? (
                            <img
                              src={approval.approver.imageUrl}
                              alt=""
                              className="size-8 rounded-full"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <ApproverInitials name={approval.approver?.displayName} />
                          )}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium text-foreground">
                                {approval.approver?.displayName}
                              </p>
                              <div className="flex items-center gap-2">
                                <StatusBadge
                                  {...{
                                    tone: approvalTone(approval.status),
                                    label:
                                      (approval.status || "pending").charAt(0).toUpperCase() +
                                      (approval.status || "pending").slice(1),
                                  }}
                                />
                                {approval.status !== "pending" && approval.modifiedOn ? (
                                  <span className="text-[11px] text-muted-foreground">
                                    {new Date(approval.modifiedOn).toLocaleString()}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {approval.approver?.uniqueName?.startsWith("vstfs:")
                                ? approval.approvedBy?.uniqueName ||
                                  `Team: ${approval.approver.displayName}`
                                : approval.approver?.uniqueName}
                            </p>
                            {approval.instructions ? (
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">Instructions:</span>{" "}
                                {approval.instructions}
                              </p>
                            ) : null}
                            {approval.comments ? (
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">Comments:</span>{" "}
                                {approval.comments}
                              </p>
                            ) : null}
                            {approval.approvedBy ? (
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">
                                  {approval.status === "approved" ? "Approved" : "Rejected"} by:
                                </span>{" "}
                                {approval.approvedBy.displayName}
                              </p>
                            ) : null}
                            {approval.createdOn ? (
                              <p className="text-[11px] text-muted-foreground">
                                Created: {new Date(approval.createdOn).toLocaleString()}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No approvals required for this environment
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
