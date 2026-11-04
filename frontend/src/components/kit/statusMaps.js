/**
 * Status → { tone, label } helpers for StatusBadge.
 * tone: neutral | success | warning | danger | info
 */

function result(tone, label) {
  return { tone, label };
}

/** @param {{ status?: string, result?: string }} build */
export function buildStatus(build) {
  if (!build) return result("neutral", "Unknown");
  if (build.status === "inProgress") return result("info", "In Progress");
  const map = {
    succeeded: ["success", "Succeeded"],
    failed: ["danger", "Failed"],
    canceled: ["neutral", "Canceled"],
    cancelled: ["neutral", "Canceled"],
    partiallySucceeded: ["warning", "Partial"],
  };
  const entry = map[build.result];
  if (entry) return result(entry[0], entry[1]);
  if (build.status) return result("neutral", String(build.status));
  return result("neutral", "Unknown");
}

/** @param {{ status?: string }} pr */
export function prStatus(pr) {
  if (!pr?.status) return result("neutral", "Unknown");
  const map = {
    active: ["info", "Active"],
    completed: ["success", "Completed"],
    abandoned: ["neutral", "Abandoned"],
  };
  const entry = map[pr.status];
  return entry ? result(entry[0], entry[1]) : result("neutral", pr.status);
}

/**
 * Merge / review readiness from mergeStatus + reviewers + lifecycle status.
 * @param {{ status?: string, mergeStatus?: string, reviewers?: Array<{ vote?: number }> }} pr
 */
export function prReviewState(pr) {
  if (!pr) return result("neutral", "Unknown");
  if (pr.status === "completed") return result("success", "Merged");
  if (pr.status === "abandoned") return result("neutral", "Abandoned");

  const merge = (pr.mergeStatus || "").toLowerCase();
  if (merge === "conflicts") return result("danger", "Conflicts");
  if (merge === "queued") return result("info", "Queued");
  if (merge === "succeeded") return result("success", "Ready");

  const reviewers = pr.reviewers || [];
  if (pr.status === "active" && reviewers.length === 0) {
    return result("warning", "Needs Reviewers");
  }
  const hasReject = reviewers.some((r) => typeof r.vote === "number" && r.vote < 0);
  if (hasReject) return result("danger", "Changes Requested");
  const hasApprove = reviewers.some((r) => typeof r.vote === "number" && r.vote > 0);
  if (pr.status === "active" && hasApprove && merge !== "conflicts") {
    return result("success", "Ready");
  }
  if (pr.status === "active") return result("warning", "Pending");
  return result("neutral", "Pending");
}

/** @param {{ status?: string, failureReason?: string }} release */
export function releaseStatus(release) {
  if (!release) return result("neutral", "Unknown");
  const reason = (release.failureReason || "").toLowerCase();
  if (reason === "approval_rejected") return result("danger", "Approval Rejected");

  const raw = (release.status || "").toLowerCase().replace(/[\s_-]/g, "");
  const map = {
    succeeded: ["success", "Succeeded"],
    failed: ["danger", "Failed"],
    rejected: ["danger", "Rejected"],
    canceled: ["neutral", "Canceled"],
    cancelled: ["neutral", "Canceled"],
    abandoned: ["warning", "Abandoned"],
    waitingforapproval: ["warning", "Waiting for Approval"],
    inprogress: ["info", "In Progress"],
    deploying: ["info", "Deploying"],
    pending: ["warning", "Not Deployed"],
    notstarted: ["warning", "Not Deployed"],
    notdeployed: ["warning", "Not Deployed"],
    approved: ["success", "Approved"],
  };
  const entry = map[raw];
  if (entry) return result(entry[0], entry[1]);
  if (release.status) return result("neutral", String(release.status));
  return result("neutral", "Unknown");
}

/** @param {string} state */
export function workItemState(state) {
  if (!state) return result("neutral", "Unknown");
  const key = String(state).toLowerCase().trim();
  const map = {
    new: "info",
    "to do": "info",
    todo: "info",
    active: "warning",
    "in progress": "warning",
    inprogress: "warning",
    resolved: "success",
    done: "success",
    closed: "success",
    removed: "danger",
    blocked: "danger",
  };
  const tone = map[key] || "neutral";
  return result(tone, state);
}

/** @param {string} level */
export function logLevel(level) {
  const key = String(level || "").toLowerCase();
  const map = {
    error: ["danger", "ERROR"],
    warn: ["warning", "WARN"],
    warning: ["warning", "WARN"],
    info: ["info", "INFO"],
    debug: ["neutral", "DEBUG"],
  };
  const entry = map[key];
  return entry
    ? result(entry[0], entry[1])
    : result("neutral", String(level || "UNKNOWN").toUpperCase());
}

/**
 * @param {{ type?: string, subType?: string, read?: boolean }} n
 */
export function notificationSeverity(n) {
  if (!n) return result("neutral", "Unknown");
  const type = n.type || "";
  const sub = (n.subType || "").toLowerCase();

  const typeLabel =
    {
      build: "Build",
      release: "Release",
      "work-item": "Work item",
      "pull-request": "PR",
      overdue: "Overdue",
      "idle-pr": "Stale PR",
    }[type] ||
    type ||
    "Notification";

  if (type === "overdue" || type === "idle-pr" || sub === "failed" || sub === "rejected") {
    return result("danger", sub ? `${typeLabel} · ${sub}` : typeLabel);
  }
  if (type === "work-item" && sub === "updated") {
    return result("warning", `${typeLabel} · updated`);
  }
  if (sub === "succeeded" || sub === "completed") {
    return result("success", `${typeLabel} · ${sub}`);
  }
  if (sub === "partially-succeeded" || sub === "partiallysucceeded") {
    return result("warning", `${typeLabel} · partial`);
  }
  if (!n.read) {
    return result("info", sub ? `${typeLabel} · ${sub}` : typeLabel);
  }
  return result("neutral", sub ? `${typeLabel} · ${sub}` : typeLabel);
}
