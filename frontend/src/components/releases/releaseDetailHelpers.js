/**
 * Helpers for release detail sheet. Status vocabulary matches kit releaseStatus.
 */

export function isFailedRelease(release) {
  return release?.status === "failed";
}

export function isWaitingForApproval(release) {
  return release?.status === "waitingforapproval";
}

export function isSucceededRelease(release) {
  return release?.status === "succeeded";
}

export function isInProgressRelease(release) {
  return release?.status === "inprogress" || release?.status === "deploying";
}

export function isApprovalRejected(release) {
  return release?.status === "failed" && release?.failureReason === "approval_rejected";
}

export function envCounts(release) {
  const environments = release?.environments || [];
  const failedEnvCount = environments.filter((env) => {
    const s = env.status?.toLowerCase();
    return s === "failed" || s === "rejected";
  }).length;
  const succeededEnvCount = environments.filter(
    (env) => env.status?.toLowerCase() === "succeeded"
  ).length;
  return {
    failedEnvCount,
    succeededEnvCount,
    totalEnvCount: environments.length,
  };
}

export function getDefaultTab(release) {
  if (isFailedRelease(release)) return "logs";
  return "approvals";
}

export function environmentApprovalStatus(envApproval) {
  const approvals = envApproval?.approvals || [];
  const hasRejected = approvals.some((a) => a.status?.toLowerCase() === "rejected");
  const hasPending = approvals.some((a) => a.status?.toLowerCase() === "pending");
  const allApproved =
    approvals.length > 0 && approvals.every((a) => a.status?.toLowerCase() === "approved");

  if (hasRejected) return "rejected";
  if (hasPending) return "pending";
  if (allApproved) return "approved";
  return "pending";
}

/** Dot / bar tone for an environment status string. */
export function envStatusTone(status) {
  const raw = (status || "").toLowerCase().replace(/[\s_-]/g, "");
  if (raw === "succeeded" || raw === "approved") return "success";
  if (raw === "failed" || raw === "rejected") return "danger";
  if (
    raw === "waitingforapproval" ||
    raw === "pending" ||
    raw === "notstarted" ||
    raw === "notdeployed"
  ) {
    return "warning";
  }
  if (raw === "inprogress" || raw === "deploying") return "info";
  return "neutral";
}

export const ENV_DOT_CLASS = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-neutral",
};
