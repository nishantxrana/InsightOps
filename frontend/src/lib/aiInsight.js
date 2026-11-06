import axios from "axios";

const SETTINGS_AI_HREF = "/settings?section=ai";

/**
 * Format provider/model meta for AiInsightPanel.
 * @param {{ provider?: string, model?: string, cached?: boolean, generatedAt?: string, latencyMs?: number } | null | undefined} meta
 * @returns {string | undefined}
 */
export function formatAiMetaLine(meta) {
  if (!meta?.provider && !meta?.model) return undefined;
  const providerLabel = formatProviderName(meta.provider);
  const parts = [];
  if (providerLabel && meta.model) {
    parts.push(`${providerLabel} / ${meta.model}`);
  } else if (providerLabel) {
    parts.push(providerLabel);
  } else if (meta.model) {
    parts.push(meta.model);
  }
  if (meta.generatedAt) {
    parts.push(`generated ${formatRelativeTime(meta.generatedAt)}`);
  }
  if (meta.cached) {
    parts.push("cached");
  }
  return parts.join(", ");
}

function formatProviderName(provider) {
  if (!provider) return "";
  const map = {
    openai: "OpenAI",
    groq: "Groq",
    gemini: "Gemini",
    azure: "Azure",
  };
  return map[provider] || provider;
}

function formatRelativeTime(iso) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "just now";
  const diffSec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (diffSec < 60) return "just now";
  const mins = Math.round(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return new Date(iso).toLocaleString();
}

/**
 * Fetch org AI status once (cheap). Returns null on failure.
 * @param {{ Authorization?: string, "X-Organization-ID"?: string }} [headers]
 */
export async function fetchAiStatus(headers) {
  try {
    const response = await axios.get("/api/ai/status", { headers });
    return response.data;
  } catch {
    return null;
  }
}

/**
 * Whether Generate should be offered based on /api/ai/status.
 * @param {{ enabled?: boolean, configured?: boolean } | null | undefined} status
 */
export function isAiGeneratable(status) {
  if (!status) return true; // optimistic until status loads
  if (status.enabled === false) return false;
  if (status.configured === false) return false;
  return true;
}

/**
 * Disabled reason + settings link when AI cannot run.
 * @param {{ enabled?: boolean, configured?: boolean } | null | undefined} status
 * @returns {{ reason: string, href: string } | null}
 */
export function aiDisabledInfo(status) {
  if (!status) return null;
  if (status.enabled === false) {
    return {
      reason: "AI is turned off for this organization.",
      href: SETTINGS_AI_HREF,
    };
  }
  if (status.configured === false) {
    return {
      reason: "AI is not configured. Add a provider and API key in Settings.",
      href: SETTINGS_AI_HREF,
    };
  }
  return null;
}

/**
 * Map API availability / special statuses to panel props.
 * @param {{ status?: string, message?: string, summary?: string }} payload
 */
export function mapAiAvailabilityToPanel(payload) {
  if (!payload) return null;
  if (payload.status === "not_configured" || payload.status === "disabled") {
    return {
      state: "disabled",
      disabledReason: payload.message || "AI is not available.",
      settingsHref: SETTINGS_AI_HREF,
      settingsLabel: "Open AI settings",
    };
  }
  if (payload.status === "disabled_large_dataset") {
    return {
      state: "disabled",
      disabledReason:
        payload.message ||
        payload.summary ||
        "AI analysis is limited for sprints with more than 100 work items.",
    };
  }
  return null;
}

/**
 * Extract user-facing message + hint from structured AI errors.
 * @param {unknown} error
 */
export function aiErrorText(error) {
  const data = error?.response?.data;
  const nested = data?.error;
  if (nested && typeof nested === "object") {
    const message = nested.message || "AI request failed.";
    const hint = nested.hint ? ` ${nested.hint}` : "";
    return `${message}${hint}`.trim();
  }
  if (typeof nested === "string") return nested;
  return error?.userMessage || "AI insight temporarily unavailable.";
}

export { SETTINGS_AI_HREF };
