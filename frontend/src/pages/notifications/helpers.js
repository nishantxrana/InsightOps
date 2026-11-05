import { TYPE_LABELS, TYPE_VALUES } from "./constants";

/**
 * @param {string} value
 * @returns {string}
 */
export function normalizeTypeParam(value) {
  return TYPE_VALUES.includes(value) ? value : "all";
}

/**
 * Human title-case subtype label (no emoji).
 * @param {string|undefined|null} subType
 */
export function humanSubType(subType) {
  if (!subType) return "";
  const spaced = String(subType)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .trim()
    .toLowerCase();
  if (!spaced) return "";
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * One-line message preview for the collapsed row.
 * @param {string|undefined|null} message
 * @param {number} [max=120]
 */
export function messagePreview(message, max = 120) {
  if (!message) return "";
  const text = String(message).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

/**
 * Loaded-page failure check used by the header "Has failures" pill.
 * @param {Array<{ type?: string, subType?: string }>} notifications
 */
export function hasLoadedFailures(notifications) {
  return (notifications || []).some((n) => {
    const sub = (n.subType || "").toLowerCase();
    return (n.type === "build" || n.type === "release") && (sub === "failed" || sub === "rejected");
  });
}

/**
 * @param {Record<string, number>} counts
 * @param {string} type
 */
export function countForType(counts, type) {
  if (type === "all") return counts.total ?? 0;
  return counts[type] ?? 0;
}

/**
 * Empty-state description when the feed has no rows (and no search).
 * @param {string} type
 */
export function emptyDescriptionForType(type) {
  if (type === "all") {
    return "No notifications in the last 7 days. Check back later.";
  }
  const label = TYPE_LABELS[type] || type;
  return `No ${label.toLowerCase()} notifications found.`;
}

/** Left accent / icon color classes from severity tone (status tokens only). */
export const TONE_ACCENT = {
  danger: "border-l-danger",
  warning: "border-l-warning",
  success: "border-l-success",
  info: "border-l-info",
  neutral: "border-l-border",
};

export const TONE_ICON = {
  danger: "text-danger",
  warning: "text-warning",
  success: "text-success",
  info: "text-info",
  neutral: "text-muted-foreground",
};
