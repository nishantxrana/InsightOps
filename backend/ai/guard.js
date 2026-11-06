import { hasAIConfig, getAIConfig } from "../utils/organizationSettings.js";

/**
 * Gate interactive AI and webhook AI on org enablement + credentials.
 *
 * @param {object} org Organization document (with decrypted keys when needed)
 * @param {string} [_feature] Optional feature label for future use
 * @returns {{ ok: true, config: object } | { ok: false, status: "disabled"|"not_configured", message: string }}
 */
export function assertAiAvailable(org, _feature) {
  void _feature;
  if (!org?.ai) {
    return {
      ok: false,
      status: "not_configured",
      message: "AI is not configured. Add a provider and API key in Settings → AI.",
    };
  }

  if (org.ai.enabled === false) {
    return {
      ok: false,
      status: "disabled",
      message: "AI is turned off for this organization. Enable it in Settings → AI.",
    };
  }

  if (!hasAIConfig(org)) {
    return {
      ok: false,
      status: "not_configured",
      message: "AI is not configured. Add a provider and API key in Settings → AI.",
    };
  }

  return { ok: true, config: getAIConfig(org) };
}
