/**
 * Client-side mirror of backend normalizeAzureEndpoint for live preview only.
 * Server remains authoritative on save/test.
 */
const DEFAULT_SUFFIXES = [
  ".openai.azure.com",
  ".services.ai.azure.com",
  ".cognitiveservices.azure.com",
];

export function previewAzureEndpoint(input) {
  if (input == null || typeof input !== "string" || !input.trim()) {
    return { ok: false, reason: "Endpoint is required" };
  }

  let raw = input.trim();
  if (/^https?:\/\/[^/@]*@/i.test(raw)) {
    return { ok: false, reason: "Endpoint must not include credentials" };
  }

  try {
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
    const url = new URL(raw);
    if (url.protocol !== "https:") {
      return { ok: false, reason: "Endpoint must use https" };
    }
    if (url.username || url.password) {
      return { ok: false, reason: "Endpoint must not include credentials" };
    }
    if (url.port && url.port !== "443") {
      return { ok: false, reason: "Endpoint must use port 443" };
    }
    const host = url.hostname.toLowerCase();
    if (!host) return { ok: false, reason: "Endpoint host is missing" };
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) {
      return { ok: false, reason: "Endpoint must use a hostname, not an IP address" };
    }
    if (host === "localhost" || host.endsWith(".localhost")) {
      return { ok: false, reason: "Localhost endpoints are not allowed" };
    }
    const allowed = DEFAULT_SUFFIXES.some(
      (suffix) => host === suffix.slice(1) || host.endsWith(suffix)
    );
    if (!allowed) {
      return {
        ok: false,
        reason: "Host must end with an allowed Azure suffix",
      };
    }
    return { ok: true, baseUrl: `https://${host}/openai/v1/`, host };
  } catch {
    return { ok: false, reason: "Endpoint is not a valid URL" };
  }
}
