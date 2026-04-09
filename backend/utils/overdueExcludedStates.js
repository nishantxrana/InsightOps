/**
 * Build a set of lowercased state names to exclude from overdue polling notifications.
 * @param {unknown} raw - org.polling.overdueExcludedStates
 * @returns {Set<string>}
 */
export function buildExcludedStatesSet(raw) {
  return new Set(
    (Array.isArray(raw) ? raw : [])
      .filter((s) => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.toLowerCase())
  );
}

/**
 * @param {object} item - Azure DevOps work item with fields
 * @param {Set<string>} excludedStatesLower
 * @returns {boolean} true if this item should be removed from overdue notification lists
 */
export function isWorkItemExcludedByState(item, excludedStatesLower) {
  if (!excludedStatesLower || excludedStatesLower.size === 0) return false;
  const state = item?.fields?.["System.State"];
  if (state == null || state === "") return false;
  return excludedStatesLower.has(String(state).trim().toLowerCase());
}

/**
 * Whether overdue polling should apply the excluded-states filter.
 * Keywords apply only when `overdueExcludedStatesEnabled` is explicitly true.
 * @param {object|undefined} orgPolling - org.polling
 * @returns {boolean}
 */
export function shouldApplyExcludedStateFilter(orgPolling) {
  if (!orgPolling || orgPolling.overdueExcludedStatesEnabled !== true) return false;
  return buildExcludedStatesSet(orgPolling.overdueExcludedStates).size > 0;
}
