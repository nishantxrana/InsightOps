/**
 * Cache key builders for AI feature responses.
 */

export function sprintSummaryCacheKey(orgId, itemIdsPrefix, itemCount) {
  return `sprint_summary_${orgId}_${itemIdsPrefix}_${itemCount}`;
}

export function workItemExplainCacheKey(orgId, workItemId, rev) {
  return `workitem_explain_${orgId}_${workItemId}_${rev}`;
}

export function pullRequestExplainCacheKey(orgId, pullRequestId, commitId) {
  return `pr_explain_${orgId}_${pullRequestId}_${commitId || "initial"}`;
}

export function buildAnalyzeCacheKey(orgId, buildId, status, finishTime) {
  const finish = finishTime || "pending";
  return `build_analyze_${orgId}_${buildId}_${status || "unknown"}_${finish}`;
}

export function releaseAnalyzeCacheKey(orgId, releaseId, modifiedOrStatus) {
  return `release_analyze_${orgId}_${releaseId}_${modifiedOrStatus || "unknown"}`;
}

export const AI_CACHE_TTL = {
  sprintSummary: 1800,
  workItemExplain: 3600,
  pullRequestExplain: 3600,
  buildAnalyze: 1800,
  releaseAnalyze: 1800,
};
